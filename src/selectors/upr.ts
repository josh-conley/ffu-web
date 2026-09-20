import type { SeasonData } from '@/data'
import { regularSeasonTotals, regularSeasonWeeksPlayed } from './games'

// Unified Power Rating. Formula ported verbatim from the old upr-calculator.ts — keep exactly:
//   ((avg × 6) + ((high + low) × 2) + (winPct × 400)) / 10
// Computed over REGULAR-SEASON games only (high/low here are regular-season, distinct from the
// all-games high/low shown on the Records page).

export interface UprInputs {
  wins: number
  losses: number
  ties: number
  average: number
  high: number
  low: number
}

export function calculateUpr({ wins, losses, ties, average, high, low }: UprInputs): number {
  const totalGames = wins + losses + ties
  const winPct = totalGames > 0 ? (wins + ties * 0.5) / totalGames : 0
  const upr = (average * 6 + (high + low) * 2 + winPct * 400) / 10
  return Math.round(upr * 100) / 100
}

/**
 * Weeks a season needs before its UPR means anything.
 *
 * Two of the formula's three inputs are a team's high and its low, so after one week they ARE that
 * week's score and the rating is just a re-scaled box score; the win% term swings 400 points on a
 * single result. Four weeks is where the league has always considered the picture to have settled,
 * and it is the point the commissioner asked for.
 */
export const UPR_MIN_WEEKS = 4

/**
 * UPR per member for a season — EMPTY until the season has `UPR_MIN_WEEKS` weeks in the book, so a
 * young season contributes no rating anywhere rather than a misleading one. Every backfilled season
 * is complete, so only the season in progress is ever withheld. Callers render a missing rating as
 * "—" or drop the column; see `UprNote`.
 */
export function seasonUpr(season: SeasonData): Map<string, number> {
  const result = new Map<string, number>()
  if (regularSeasonWeeksPlayed(season) < UPR_MIN_WEEKS) return result
  for (const [id, t] of regularSeasonTotals(season)) {
    result.set(id, calculateUpr(t))
  }
  return result
}
