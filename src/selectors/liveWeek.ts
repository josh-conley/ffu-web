import type { Game, LiveSeasonData, NflState } from '@/data'
import { emptyTotals, regularSeasonTotals, type TeamTotals } from './games'
import { MIN_STREAK, currentStreaks, type Streak } from './weekForm'

/** This week's games — may carry live/in-progress scores. */
export function currentWeekMatchups(data: LiveSeasonData): Game[] {
  return data.games.filter((g) => g.week === data.currentWeek)
}

export interface LiveStandingRow {
  totals: TeamTotals
  rank: number
  /** The run they are on, once it is worth reporting (`MIN_STREAK`); absent otherwise. Same
   *  definition the recap's Hot & Cold block uses, so the two can never disagree. */
  streak?: Streak
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
  const games = data.games.filter((g) => g.week < data.currentWeek)
  const totals = regularSeasonTotals({ games })
  const streaks = currentStreaks(games, data.tier, data.currentWeek - 1)
  const sorted = data.memberIds
    .map((memberId) => totals.get(memberId) ?? emptyTotals(memberId))
    .sort((a, b) => (b.winPct !== a.winPct ? b.winPct - a.winPct : b.pointsFor - a.pointsFor))

  const rows: LiveStandingRow[] = []
  let rank = 1
  sorted.forEach((t, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && !tiedWithPrevious(t, prev)) rank = i + 1
    const streak = streaks.get(t.memberId)
    rows.push(streak !== undefined && streak.length >= MIN_STREAK ? { totals: t, rank, streak } : { totals: t, rank })
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
 * The week of `year` being played right now, or undefined when none is — the season shown isn't the
 * one Sleeper is reporting, it's the offseason or playoffs, or kickoff hasn't happened yet. Lets a
 * page tell the week in progress apart from the weeks merely still to come: both are unplayed as far
 * as the data files go (only completed weeks are written), but only one is live.
 */
export function liveWeekFor(year: string, state: NflState | undefined, now: number = Date.now()): number | undefined {
  if (!state || state.year !== year || state.seasonType !== 'regular') return undefined
  if (!seasonHasStarted(state, now)) return undefined
  return state.week
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
