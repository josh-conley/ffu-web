import type { Game, LiveSeasonData } from '@/data'
import { emptyTotals, regularSeasonTotals, type TeamTotals } from './games'

/** This week's games — may carry live/in-progress scores. */
export function currentWeekMatchups(data: LiveSeasonData): Game[] {
  return data.games.filter((g) => g.week === data.currentWeek)
}

export interface LiveStandingRow {
  totals: TeamTotals
  rank: number
}

/** Two rows share a rank when winPct AND pointsFor are equal (mirrors selectors/standings.ts). */
function tiedWithPrevious(a: TeamTotals, b: TeamTotals): boolean {
  return a.winPct === b.winPct && a.pointsFor === b.pointsFor
}

/**
 * Standings derived ONLY from completed weeks (never the in-progress current week), so a team's
 * record never includes a partial live score. A member with no completed games yet (week 1) still
 * gets a row, all zeros, rather than being omitted.
 */
export function standingsThroughPreviousWeek(data: LiveSeasonData): LiveStandingRow[] {
  const completed = { games: data.games.filter((g) => g.week < data.currentWeek) }
  const totals = regularSeasonTotals(completed)
  const sorted = data.memberIds
    .map((memberId) => totals.get(memberId) ?? emptyTotals(memberId))
    .sort((a, b) => (b.winPct !== a.winPct ? b.winPct - a.winPct : b.pointsFor - a.pointsFor))

  const rows: LiveStandingRow[] = []
  let rank = 1
  sorted.forEach((t, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && !tiedWithPrevious(t, prev)) rank = i + 1
    rows.push({ totals: t, rank })
  })
  return rows
}
