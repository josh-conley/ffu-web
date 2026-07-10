import type { Tier } from '@/config/types'
import { memberBySleeperId } from '@/config'
import type { Game, GameParticipant, LiveSeasonData } from './types'
import { assertGame } from './validate'

// Live client-side reads of Sleeper's public API for the season currently in progress. Deliberately
// NOT part of `LeagueDataProvider`/`getSeason` (see LiveSeasonData in types.ts): that contract and
// its validator assume a mostly-complete season, which every other page/selector already relies on,
// so retrofitting it for a partial in-progress season would be a much larger, riskier change than
// this home-page-only feature needs. This module is additive and used only by useLiveWeek.

const API = 'https://api.sleeper.app/v1'

async function sleeperGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`Sleeper ${path} -> HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export interface NflState {
  week: number
  seasonType: 'pre' | 'regular' | 'post'
  year: string
}

/** The current NFL week per Sleeper — flips over Tuesday morning after Monday Night Football. */
export async function fetchNflState(): Promise<NflState> {
  const raw = await sleeperGet<{ week: number; season_type: string; season: string }>('/state/nfl')
  const seasonType: NflState['seasonType'] = raw.season_type === 'regular' || raw.season_type === 'post' ? raw.season_type : 'pre'
  return { week: raw.week, seasonType, year: raw.season }
}

interface SleeperRoster {
  roster_id: number
  owner_id: string
}

/** roster_id -> ffuId, via the same config used by scripts/backfill-lineups.mjs (memberBySleeperId).
 *  A roster whose owner isn't in `members.ts` yet is dropped (warned, not thrown) — expected on day
 *  one of a new season before every new member has been added to config. */
async function fetchRosterMap(leagueId: string): Promise<Map<number, string>> {
  const rosters = await sleeperGet<SleeperRoster[]>(`/league/${leagueId}/rosters`)
  if (!Array.isArray(rosters)) throw new Error(`Sleeper league/${leagueId}/rosters: not an array`)
  const map = new Map<number, string>()
  for (const r of rosters) {
    const member = memberBySleeperId(String(r.owner_id))
    if (!member) {
      console.warn(`[liveSleeper] roster ${r.roster_id} (owner ${r.owner_id}) has no matching Member yet — its games are dropped`)
      continue
    }
    map.set(r.roster_id, member.ffuId)
  }
  return map
}

interface SleeperMatchupEntry {
  roster_id: number
  matchup_id: number | null
  points: number
}

/** One pairing -> a Game, or null when it can't be resolved (bye, unmapped roster, uneven group). */
function buildGame(week: number, entries: SleeperMatchupEntry[], rosterMap: Map<number, string>): Game | null {
  if (entries.length !== 2) return null
  const [e0, e1] = entries
  if (e0 === undefined || e1 === undefined) return null
  const m0 = rosterMap.get(e0.roster_id)
  const m1 = rosterMap.get(e1.roster_id)
  if (m0 === undefined || m1 === undefined) return null
  const participants: [GameParticipant, GameParticipant] = [
    { memberId: m0, score: e0.points },
    { memberId: m1, score: e1.points },
  ]
  const game: Game = { week, isPlayoff: false, participants }
  assertGame(game, `live wk${week}`)
  return game
}

async function fetchWeekGames(leagueId: string, week: number, rosterMap: Map<number, string>): Promise<Game[]> {
  const entries = await sleeperGet<SleeperMatchupEntry[]>(`/league/${leagueId}/matchups/${week}`)
  if (!Array.isArray(entries)) throw new Error(`Sleeper league/${leagueId}/matchups/${week}: not an array`)
  const byMatchup = new Map<number, SleeperMatchupEntry[]>()
  for (const e of entries) {
    if (e.matchup_id === null) continue // bye
    const group = byMatchup.get(e.matchup_id) ?? []
    group.push(e)
    byMatchup.set(e.matchup_id, group)
  }
  const games: Game[] = []
  for (const group of byMatchup.values()) {
    const game = buildGame(week, group, rosterMap)
    if (game) games.push(game)
  }
  return games
}

/**
 * The live season through `currentWeek` (inclusive — that week's scores may be partial/in progress).
 * `currentWeek` is supplied by the caller (from `fetchNflState`, or a fixed week when exercising this
 * against a real completed season for testing) rather than fetched again here.
 */
export async function fetchLiveSeason(tier: Tier, year: string, leagueId: string, currentWeek: number): Promise<LiveSeasonData> {
  const rosterMap = await fetchRosterMap(leagueId)
  const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1)
  const gamesByWeek = await Promise.all(weeks.map((week) => fetchWeekGames(leagueId, week, rosterMap)))
  return {
    tier,
    year,
    currentWeek,
    memberIds: [...new Set(rosterMap.values())],
    games: gamesByWeek.flat(),
  }
}
