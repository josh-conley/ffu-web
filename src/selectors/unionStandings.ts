import type { Tier } from '@/config'
import type { SeasonData, SeasonTeam } from '@/data'
import { finalStandings } from './standings'
import { seasonUpr } from './upr'

/**
 * One year's three leagues as a single 36-team table — the Union view of a season.
 *
 * Ordered by UPR, because it is the only number the FFU already owns that compares a Premier team
 * to a National one: record alone hides that the tiers play different competition, and raw points
 * hide that they score in different environments. Each row keeps the placement its own league's
 * table gives it, so a team's standing there is never contradicted here.
 */
export interface UnionStandingRow {
  team: SeasonTeam
  tier: Tier
  /** Rank across all three leagues, by UPR (ties share a rank). */
  rank: number
  /** The placement the team's own league table shows — final after playoffs, else the current seed. */
  leagueRank: number
  winPct: number
  upr: number
}

type Unranked = Omit<UnionStandingRow, 'rank'>

/** UPR desc; then the per-league tiebreak chain, so equal ratings still land in a stable order. */
function compare(a: Unranked, b: Unranked): number {
  if (a.upr !== b.upr) return b.upr - a.upr
  if (a.winPct !== b.winPct) return b.winPct - a.winPct
  return b.team.points.for - a.team.points.for
}

function rowsFor(season: SeasonData): Unranked[] {
  const upr = seasonUpr(season)
  return finalStandings(season).map((row) => ({
    team: row.team,
    tier: season.tier,
    leagueRank: row.rank,
    winPct: row.winPct,
    upr: upr.get(row.team.memberId) ?? 0,
  }))
}

/**
 * Every team in the given seasons (one year's tiers), ranked together.
 *
 * Ties share a rank on UPR alone — the same rule the league tables use for their own key, rather
 * than letting a tiebreak that exists only to stabilise the sort silently separate two equal teams.
 */
export function unionStandings(seasons: SeasonData[]): UnionStandingRow[] {
  const sorted = seasons.flatMap(rowsFor).sort(compare)
  let rank = 1
  return sorted.map((row, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && prev.upr !== row.upr) rank = i + 1
    return { ...row, rank }
  })
}
