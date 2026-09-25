import type { Game } from '@/data'
import { fetchLiveWeeksGames } from '@/data'
import { useAsyncData } from './useAsyncData'

/**
 * Sleeper's current scores for `weeks` of a league — for weeks being played (or just finished)
 * that the season file doesn't have yet. Fetched once per mount, like the home page's This Week;
 * reloading gets fresh scores. Does nothing when `leagueId` is absent or `weeks` is empty.
 */
export function useLiveWeekGames(leagueId: string | undefined, weeks: readonly number[]): Game[] {
  const enabled = leagueId !== undefined && weeks.length > 0
  const { data } = useAsyncData(`live-week-games:${leagueId ?? ''}:${weeks.join(',')}`, () => fetchLiveWeeksGames(leagueId as string, weeks), enabled)
  return enabled ? data ?? [] : []
}
