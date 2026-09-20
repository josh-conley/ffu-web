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
function byUprThenRecord(a: Unranked, b: Unranked): number {
  if (a.upr !== b.upr) return b.upr - a.upr
  if (a.winPct !== b.winPct) return b.winPct - a.winPct
  return b.team.points.for - a.team.points.for
}

/**
 * The pre-UPR fallback: each league's placement first, points for as the tiebreak. The three
 * leaders sit together at the top, then the three seconds, and so on — a roundup of where the
 * leagues stand, rather than a cross-league rating the season hasn't earned the right to state yet.
 */
function byLeagueRankThenPoints(a: Unranked, b: Unranked): number {
  if (a.leagueRank !== b.leagueRank) return a.leagueRank - b.leagueRank
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

/** Ties share a rank on whatever the table is ACTUALLY ranked by — a tiebreak that exists only to
 *  stabilise the sort shouldn't silently separate two equal teams. */
function tied(a: UnionStandingRow | undefined, b: Unranked, byUpr: boolean): boolean {
  if (a === undefined) return true
  if (byUpr) return a.upr === b.upr
  return a.leagueRank === b.leagueRank && a.team.points.for === b.team.points.for
}

/**
 * Every team in the given seasons (one year's tiers), ranked together.
 *
 * Before the season has earned a UPR (see `UPR_MIN_WEEKS`), it ranks on league placement with
 * points for as the tiebreak instead — a young Union table still reads as standings rather than as
 * 36 teams tied for first.
 */
export function unionStandings(seasons: SeasonData[]): UnionStandingRow[] {
  const rows = seasons.flatMap(rowsFor)
  const byUpr = rows.some((row) => row.upr > 0)
  const sorted = rows.sort(byUpr ? byUprThenRecord : byLeagueRankThenPoints)
  const ranked: UnionStandingRow[] = []
  let rank = 1
  sorted.forEach((row, i) => {
    if (!tied(ranked[i - 1], row, byUpr)) rank = i + 1
    ranked.push({ ...row, rank })
  })
  return ranked
}

/** Whether the rows are ranked by UPR, or are still falling back to record (pre-`UPR_MIN_WEEKS`). */
export function rankedByUpr(rows: UnionStandingRow[]): boolean {
  return rows.some((row) => row.upr > 0)
}
