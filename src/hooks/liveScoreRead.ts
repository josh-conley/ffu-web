import type { NflGameClock } from '@/data'
import { fetchNflWeekGames } from '@/data'
import { livePollDelay, scoresMoving } from '@/selectors'

// Shared by the two live-score polls (the home page's week, the popped-out box score), so both
// follow one rule: read past Sleeper's CDN only while points can actually move, and wake for the
// next kickoff rather than every minute all week.

/** The week's games, or undefined if the (undocumented) clock feed fails — polls then carry on as if live. */
export async function readGameClocks(year: string, week: number): Promise<NflGameClock[] | undefined> {
  try {
    // Keyed by both teams, so each game appears twice; harmless for "is any game on?".
    return Object.values(await fetchNflWeekGames(year, week))
  } catch {
    return undefined
  }
}

/** Past every cache for a viewer's Refresh, or while scores move (or might: no clocks). */
export const readFresh = (games: readonly NflGameClock[] | undefined, manual: boolean): boolean =>
  manual || games === undefined || scoresMoving(games, Date.now())

/** usePoll's interval for a read that carries the clocks it was made with. */
export const liveScoreInterval = (latest: { clocks: readonly NflGameClock[] | undefined } | undefined): number =>
  livePollDelay(latest?.clocks, Date.now())
