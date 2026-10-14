import type { SeasonLineups } from '@/data'

// A team's roster as of the latest week on file: that week's lineup, starters in slot order then the
// bench (and IR, where the source has it). The season files hold weekly lineups, not a separate
// roster, and the most recent lineup is the closest thing to "who they have now" without a live read.

export interface RosterSpot {
  /** The lineup slot ("QB", "FLEX") for a starter; "BN" bench, "IR" reserve. */
  slot: string
  playerId: string
}

export interface LatestRoster {
  week: number
  spots: RosterSpot[]
}

export function latestRoster(lineups: SeasonLineups, memberId: string): LatestRoster | undefined {
  for (let i = lineups.weeks.length - 1; i >= 0; i--) {
    const week = lineups.weeks[i]!
    const team = week.teams.find((t) => t.memberId === memberId)
    if (!team) continue
    const starters = team.starters.flatMap((p, j) => (p ? [{ slot: lineups.slots[j] ?? 'FLEX', playerId: p.playerId }] : []))
    const bench = team.bench.map((p) => ({ slot: 'BN', playerId: p.playerId }))
    const reserve = (team.reserve ?? []).map((p) => ({ slot: 'IR', playerId: p.playerId }))
    return { week: week.week, spots: [...starters, ...bench, ...reserve] }
  }
  return undefined
}
