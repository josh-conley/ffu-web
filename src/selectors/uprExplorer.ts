import { regularSeasonWeeks, type Tier } from '@/config'
import type { SeasonData } from '@/data'
import { hasBeenPlayed, regularSeasonComplete, regularSeasonTotals, type TeamTotals } from './games'
import { seasonUpr, UPR_MIN_WEEKS } from './upr'

// The UPR Explorer: every team-season rated over a span of weeks ("weeks 1–8", "weeks 8–14"), so
// a team can be compared with every other at the same point of a season. It rates each span with
// the ordinary seasonUpr over that span's games rather than a second, windowed formula, so the
// UPR_MIN_WEEKS rule (and the formula itself) can never drift between this page and the rest.

/** A span of regular-season weeks, both ends included. */
export interface WeekWindow {
  from: number
  to: number
}

export interface UprWindowRow {
  /** `${year}-${tier}-${memberId}`: unique, since a member plays one league a year. */
  key: string
  memberId: string
  year: string
  tier: Tier
  upr: number
  /** The span's regular-season totals: the rating's ingredients (average, high, low, win%). */
  totals: TeamTotals
  /** The regular season was still being played. */
  live: boolean
}

export interface RankedUprRow extends UprWindowRow {
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
 * Whether a season can be rated over the whole window. A season in progress that hasn't reached
 * the window's end is left out: its rating would cover fewer weeks than every row beside it, and
 * a 5-week rating ranked against 14-week ones isn't the same question. A FINISHED season shorter
 * than the window (the 13-week ESPN years, against "through week 14") is its whole regular
 * season, which is what the window asks of it.
 */
function coversWindow(season: SeasonData, window: WeekWindow): boolean {
  return !inProgress(season) || lastRegularWeek(season) >= window.to
}

/** Every team-season with a UPR over `window`: none for a span shorter than UPR_MIN_WEEKS. */
export function uprWindowRows(seasons: readonly SeasonData[], window: WeekWindow): UprWindowRow[] {
  const rows: UprWindowRow[] = []
  for (const season of seasons) {
    if (!coversWindow(season, window)) continue
    const span = { games: season.games.filter((g) => !g.isPlayoff && g.week >= window.from && g.week <= window.to) }
    const totals = regularSeasonTotals(span)
    const live = inProgress(season)
    for (const [memberId, upr] of seasonUpr(span)) {
      const t = totals.get(memberId)
      if (t === undefined) continue
      rows.push({ key: `${season.year}-${season.tier}-${memberId}`, memberId, year: season.year, tier: season.tier, upr, totals: t, live })
    }
  }
  return rows
}

/** Rows ranked by UPR, highest first (or lowest first); equal ratings share a rank. */
export function rankUprRows(rows: readonly UprWindowRow[], lowestFirst = false): RankedUprRow[] {
  const sorted = [...rows].sort((a, b) => (lowestFirst ? a.upr - b.upr : b.upr - a.upr))
  const ranked: RankedUprRow[] = []
  sorted.forEach((row, i) => {
    const prev = ranked[i - 1]
    ranked.push({ ...row, rank: prev !== undefined && prev.upr === row.upr ? prev.rank : i + 1 })
  })
  return ranked
}

/** Where the season in progress stands against the ranked sample, for the page's callout. */
export type LiveUprStatus =
  /** Its teams are in the sample; `top` is the first of them in the ranked order. */
  | { kind: 'ranked'; year: string; weeksPlayed: number; top: RankedUprRow; outOf: number }
  /** The window runs past the weeks it has played, so it was left out (see coversWindow).
   *  `catchUp` is the nearest window it can be ranked over: the same start where that still
   *  leaves UPR_MIN_WEEKS, ending at its latest week. Undefined while it has too few weeks. */
  | { kind: 'behind'; year: string; weeksPlayed: number; catchUp: WeekWindow | undefined }

/** The window ending at `weeksPlayed` that keeps as much of `window`'s start as a UPR allows. */
function catchUpWindow(window: WeekWindow, weeksPlayed: number): WeekWindow | undefined {
  const latestStart = weeksPlayed - UPR_MIN_WEEKS + 1
  if (latestStart < 1) return undefined
  return { from: Math.min(window.from, latestStart), to: weeksPlayed }
}

/**
 * The season in progress against `ranked` (a ranking of uprWindowRows over `window`), or undefined
 * when no season is in progress, or when nothing is rated (a span too short for UPR, which the
 * empty table already explains).
 */
export function liveUprStatus(seasons: readonly SeasonData[], ranked: readonly RankedUprRow[], window: WeekWindow): LiveUprStatus | undefined {
  const live = seasons.filter(inProgress)
  const year = live[0]?.year
  if (year === undefined) return undefined
  const weeksPlayed = Math.max(...live.map(lastRegularWeek))
  if (window.to > weeksPlayed) return { kind: 'behind', year, weeksPlayed, catchUp: catchUpWindow(window, weeksPlayed) }
  const top = ranked.find((r) => r.live)
  return top === undefined ? undefined : { kind: 'ranked', year, weeksPlayed, top, outOf: ranked.length }
}
