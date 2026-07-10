import type { Tier } from '@/config/types'
import { memberBySleeperId } from '@/config'
import type { Game, GameParticipant, LineupPlayer, LiveSeasonData, PlayerMap, TeamLineup } from './types'
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
    leagueId,
    currentWeek,
    memberIds: [...new Set(rosterMap.values())],
    games: gamesByWeek.flat(),
  }
}

// ── Live box score (fetched lazily, only when a matchup card is clicked) ───────────────────────
// Mirrors scripts/backfill-lineups.mjs's starters/bench zipping, at request time instead of offline.
// Player NAME resolution intentionally skips the season-accurate NFLverse team lookup that script
// does (extra CSV fetch, only meaningful for historical box scores) — `team` is left unresolved,
// which BoxScore already renders fine without.

const BENCH_SLOTS = new Set(['BN', 'IR', 'TAXI'])

interface SleeperFullMatchupEntry {
  roster_id: number
  starters?: string[]
  starters_points?: number[]
  players?: string[]
  players_points?: Record<string, number>
}

function zipStarters(ids: string[], points: number[]): LineupPlayer[] {
  return ids.map((playerId, i) => ({ playerId, points: points[i] ?? 0 })).filter((s) => s.playerId && s.playerId !== '0')
}

function benchOf(entry: SleeperFullMatchupEntry): LineupPlayer[] {
  const starting = new Set(entry.starters ?? [])
  return (entry.players ?? [])
    .filter((id) => id && id !== '0' && !starting.has(id))
    .map((id) => ({ playerId: id, points: entry.players_points?.[id] ?? 0 }))
}

function lineupFor(memberId: string, rosterId: number | undefined, entries: SleeperFullMatchupEntry[]): TeamLineup {
  const entry = entries.find((e) => e.roster_id === rosterId)
  if (!entry) return { memberId, starters: [], bench: [] }
  return { memberId, starters: zipStarters(entry.starters ?? [], entry.starters_points ?? []), bench: benchOf(entry) }
}

export interface LiveLineups {
  slots: string[]
  teams: [TeamLineup, TeamLineup]
}

/** Starters + bench for one game (the two named members), for the live box-score modal. */
export async function fetchLiveLineups(leagueId: string, week: number, memberIds: [string, string]): Promise<LiveLineups> {
  const [rosterMap, league, entries] = await Promise.all([
    fetchRosterMap(leagueId),
    sleeperGet<{ roster_positions?: string[] }>(`/league/${leagueId}`),
    sleeperGet<SleeperFullMatchupEntry[]>(`/league/${leagueId}/matchups/${week}`),
  ])
  if (!Array.isArray(entries)) throw new Error(`Sleeper league/${leagueId}/matchups/${week}: not an array`)
  const slots = (league.roster_positions ?? []).filter((s) => !BENCH_SLOTS.has(s))
  const rosterIdFor = (memberId: string) => [...rosterMap.entries()].find(([, id]) => id === memberId)?.[0]
  const [m0, m1] = memberIds
  return { slots, teams: [lineupFor(m0, rosterIdFor(m0), entries), lineupFor(m1, rosterIdFor(m1), entries)] }
}

interface RawSleeperPlayer {
  full_name?: string
  first_name?: string
  last_name?: string
  position?: string
}

// Sleeper's full player map is a several-MB single payload — fetch it at most once per session,
// and only when a live box score actually needs a player our static players.json doesn't have yet
// (new-this-season players; everyone else resolves from the existing static file for free).
let allPlayersPromise: Promise<Record<string, RawSleeperPlayer>> | undefined

/** Resolves ids missing from `known` (the static players map) via Sleeper's live player directory. */
export async function fetchMissingPlayers(ids: string[], known: PlayerMap): Promise<PlayerMap> {
  const missing = ids.filter((id) => !(id in known))
  if (missing.length === 0) return {}
  if (!allPlayersPromise) allPlayersPromise = sleeperGet<Record<string, RawSleeperPlayer>>('/players/nfl')
  const all = await allPlayersPromise
  const out: PlayerMap = {}
  for (const id of missing) {
    const p = all[id]
    if (!p) continue
    out[id] = { name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || id, position: p.position ?? '?' }
  }
  return out
}
