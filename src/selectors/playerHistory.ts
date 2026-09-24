import type { Tier } from '@/config'
import type { DraftData } from '@/data'
import type { PlayerAppearance } from './playerAppearances'

// One NFL player's FFU history, for the Players table's expanded row: who started him, where he was
// drafted, the title games he started in and his best weeks. Built from `playerAppearances`;
// nothing here is stored.

export interface ManagerStint {
  memberId: string
  /** Seasons this member started him, oldest first. */
  years: string[]
  starts: number
  /** Points he scored for this member. */
  points: number
}

export interface PlayerDraftRow {
  year: string
  tier: Tier
  round: number
  overall: number
  memberId: string
}

export interface PlayerTitleGame {
  year: string
  tier: Tier
  memberId: string
  /** What he scored in the final. */
  points: number
  won: boolean
}

export interface PlayerWeek {
  year: string
  tier: Tier
  week: number
  memberId: string
  points: number
  isPlayoff: boolean
}

export interface PlayerHistory {
  managers: ManagerStint[]
  drafts: PlayerDraftRow[]
  titleGames: PlayerTitleGame[]
  topWeeks: PlayerWeek[]
}

const round2 = (n: number) => Math.round(n * 100) / 100
const TOP_WEEKS = 5

function managerStints(mine: PlayerAppearance[]): ManagerStint[] {
  const byMember = new Map<string, ManagerStint>()
  for (const a of mine) {
    let m = byMember.get(a.memberId)
    if (!m) {
      m = { memberId: a.memberId, years: [], starts: 0, points: 0 }
      byMember.set(a.memberId, m)
    }
    if (!m.years.includes(a.year)) m.years.push(a.year)
    m.starts++
    m.points += a.points
  }
  return [...byMember.values()]
    .map((m) => ({ ...m, years: [...m.years].sort(), points: round2(m.points) }))
    .sort((a, b) => b.points - a.points || b.starts - a.starts)
}

/**
 * Picks of this player, matched by id. ESPN-era drafts (2018–2020) key players by an ESPN slug that
 * can't be tied to a Sleeper id reliably, so only Sleeper-era picks match — the same span the
 * lineups cover.
 */
export function playerDrafts(playerId: string, drafts: DraftData[]): PlayerDraftRow[] {
  return drafts
    .flatMap((d) =>
      d.picks
        .filter((p) => p.player.id === playerId)
        .map((p) => ({ year: d.year, tier: d.tier, round: p.round, overall: p.overall, memberId: p.memberId })),
    )
    .sort((a, b) => b.year.localeCompare(a.year) || a.overall - b.overall)
}

/** Championship finals he started in, won or lost, newest first. */
export function playerTitleGames(mine: PlayerAppearance[]): PlayerTitleGame[] {
  return mine
    .filter((a) => a.titleGame)
    .map((a) => ({ year: a.year, tier: a.tier, memberId: a.memberId, points: a.points, won: a.titleGame === 'won' }))
    .sort((a, b) => b.year.localeCompare(a.year))
}

function topWeeks(mine: PlayerAppearance[]): PlayerWeek[] {
  return [...mine]
    .sort((a, b) => b.points - a.points)
    .slice(0, TOP_WEEKS)
    .map(({ year, tier, week, memberId, points, isPlayoff }) => ({ year, tier, week, memberId, points, isPlayoff }))
}

/** Everything the expanded row shows for one player. Empty lists for a player FFU never started. */
export function playerHistory(playerId: string, appearances: PlayerAppearance[], drafts: DraftData[]): PlayerHistory {
  const mine = appearances.filter((a) => a.playerId === playerId)
  return {
    managers: managerStints(mine),
    drafts: playerDrafts(playerId, drafts),
    titleGames: playerTitleGames(mine),
    topWeeks: topWeeks(mine),
  }
}
