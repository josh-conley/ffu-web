import type { SeasonData } from '@/data'
import { regularSeasonTotals } from './games'

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

/** UPR per member for a season. */
export function seasonUpr(season: SeasonData): Map<string, number> {
  const result = new Map<string, number>()
  for (const [id, t] of regularSeasonTotals(season)) {
    result.set(id, calculateUpr(t))
  }
  return result
}
