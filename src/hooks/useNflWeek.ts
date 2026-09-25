import { fetchNflWeekGames, fetchWeekProjections } from '@/data'
import type { LiveWeekContext } from '@/selectors'
import { useAsyncData } from './useAsyncData'

/** The league-independent half of a live projection: the NFL week's game clocks + player projections. */
export type NflWeek = Omit<LiveWeekContext, 'scoring'>

/**
 * This NFL week's games and projections, fetched fresh per mount (the scores endpoint is the
 * volatile part; projections are cached per session in the data layer). Resolves to undefined on
 * failure as well as while loading: it's an undocumented Sleeper feed, and everything built on it
 * is extra detail that the box score and cards render perfectly well without.
 */
export function useNflWeek(year: string | undefined, week: number | undefined, enabled: boolean): NflWeek | undefined {
  const { data } = useAsyncData(
    `nfl-week:${year ?? ''}:${week ?? ''}`,
    async (): Promise<NflWeek> => {
      const [games, projections] = await Promise.all([fetchNflWeekGames(year as string, week as number), fetchWeekProjections(year as string, week as number)])
      return { games, projections }
    },
    enabled && year !== undefined && week !== undefined,
  )
  return data
}
