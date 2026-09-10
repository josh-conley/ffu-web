import type { Game, LiveSeasonData, NflState } from '@/data'
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

/**
 * Which live section the home page leads with.
 *
 * Sleeper rolls its week over on Tuesday morning, once Monday Night Football is done. So from
 * Tuesday until Thursday's kickoff, "this week's matchups" is twelve fixtures on 0.00 — nothing to
 * look at — while the standings have just become the interesting thing on the page, because the
 * week they summarise finished hours earlier. Tuesday gets the standings; every other day gets the
 * matchups, which are either in progress or about to be.
 *
 * Local day deliberately, like seasonHasStarted: it should be Tuesday where the reader is.
 */
export function homeLiveSection(now: Date = new Date()): 'standings' | 'matchups' {
  return now.getDay() === 2 ? 'standings' : 'matchups'
}

/**
 * Has the season Sleeper is reporting actually kicked off?
 *
 * `season_type` alone is not the answer: Sleeper flips it to `regular` the moment the preseason
 * ends, which in 2026 is ten days before week 1 — long enough for the home page to spend a week and
 * a half showing an all-zeroes "Week 1" preview as though games were under way. `season_start_date`
 * is Sleeper's own statement of when the season begins, so the gate stays data rather than becoming
 * a date hardcoded here. A missing date fails open: an unexpected payload shouldn't black out the
 * section for a season that really is being played.
 */
export function seasonHasStarted(state: NflState, now: number = Date.now()): boolean {
  const [year, month, day] = state.seasonStartDate.split('-').map(Number)
  if (!year || !month || !day) return true
  // Local midnight, not UTC: the date is a calendar day, and parsing it as an instant would open
  // the section the previous evening for anyone west of Greenwich.
  return now >= new Date(year, month - 1, day).getTime()
}
