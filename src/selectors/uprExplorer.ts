import { regularSeasonWeeks, type Tier } from '@/config'
import type { SeasonData } from '@/data'
import { hasBeenPlayed, regularSeasonComplete, regularSeasonTotals, type TeamTotals } from './games'
import { seasonUpr, UPR_MIN_WEEKS } from './upr'

// The UPR Explorer: every team-season's UPR as it stood after a given week ("through week 8"), so
// a team can be compared with every other at the same point of a season. Always from week 1: a
// rating that starts later is not one the site ever shows. Each is the ordinary seasonUpr over the
// games so far rather than a second, week-aware formula, so the formula and the UPR_MIN_WEEKS rule
// can never drift between this page and the rest.

export interface UprWeekRow {
  /** `${year}-${tier}-${memberId}`: unique, since a member plays one league a year. */
  key: string
  memberId: string
  year: string
  tier: Tier
  upr: number
  /** Regular-season totals through the week: the rating's ingredients (average, high, low, win%). */
  totals: TeamTotals
  /** The regular season was still being played. */
  live: boolean
}

export interface RankedUprRow extends UprWeekRow {
  /** Place in the ranked sample (1 = first in the chosen order); ties share it. */
  rank: number
}

/** The longest regular season of any era among `seasons`: the week slider's end. */
export function longestRegularSeason(seasons: readonly SeasonData[]): number {
  return Math.max(0, ...seasons.map((s) => regularSeasonWeeks(s.era).length))
}

/** The newest regular-season week with a result, or 0 before week 1. */
function lastRegularWeek(season: SeasonData): number {
  return Math.max(0, ...season.games.filter((g) => !g.isPlayoff).map((g) => g.week))
}

/** Played, but its regular season isn't over. */
const inProgress = (season: SeasonData) => hasBeenPlayed(season) && !regularSeasonComplete(season)

/**
 * Whether a season has reached `week`. A season in progress that hasn't is left out: its rating
 * would cover fewer weeks than every row beside it. A FINISHED season shorter than the ask (the
 * 13-week ESPN years, "through week 14") is its whole regular season, which is what it's asked for.
 */
const reached = (season: SeasonData, week: number) => !inProgress(season) || lastRegularWeek(season) >= week

/** Every team-season's UPR through `week`: none before UPR_MIN_WEEKS (seasonUpr's rule). */
export function uprThroughWeekRows(seasons: readonly SeasonData[], week: number): UprWeekRow[] {
  const rows: UprWeekRow[] = []
  for (const season of seasons) {
    if (!reached(season, week)) continue
    const sofar = { games: season.games.filter((g) => !g.isPlayoff && g.week <= week) }
    const totals = regularSeasonTotals(sofar)
    const live = inProgress(season)
    for (const [memberId, upr] of seasonUpr(sofar)) {
      const t = totals.get(memberId)
      if (t === undefined) continue
      rows.push({ key: `${season.year}-${season.tier}-${memberId}`, memberId, year: season.year, tier: season.tier, upr, totals: t, live })
    }
  }
  return rows
}

/** Rows ranked by UPR, highest first (or lowest first); equal ratings share a rank. */
export function rankUprRows(rows: readonly UprWeekRow[], lowestFirst = false): RankedUprRow[] {
  const sorted = [...rows].sort((a, b) => (lowestFirst ? a.upr - b.upr : b.upr - a.upr))
  const ranked: RankedUprRow[] = []
  sorted.forEach((row, i) => {
    const prev = ranked[i - 1]
    ranked.push({ ...row, rank: prev !== undefined && prev.upr === row.upr ? prev.rank : i + 1 })
  })
  return ranked
}

/** The season in progress, when the chosen week has left it out of the table but it could be
 *  ranked through the weeks it HAS played: what the page offers to switch to. */
export interface LiveCatchUp {
  year: string
  weeksPlayed: number
}

/**
 * The live season's catch-up (see LiveCatchUp), or undefined when there's nothing to offer: no
 * season in progress, the chosen week already includes it, or it has too few weeks for a UPR.
 */
export function liveCatchUp(seasons: readonly SeasonData[], week: number): LiveCatchUp | undefined {
  const live = seasons.filter(inProgress)
  const year = live[0]?.year
  if (year === undefined) return undefined
  const weeksPlayed = Math.max(...live.map(lastRegularWeek))
  return week > weeksPlayed && weeksPlayed >= UPR_MIN_WEEKS ? { year, weeksPlayed } : undefined
}
