import { useMemo } from 'react'
import { headToHead, seriesPreview, type SeriesPreview } from '@/selectors'
import { useCareerData } from './useLeagueData'

/**
 * The all-time series line for a game that hasn't finished (see `seriesPreview`): null for a first
 * meeting, undefined until the seasons load or for anything but a pair. Only games on file count, so
 * the live week's own result never feeds its preview.
 */
export function useSeriesPreview(memberIds: readonly string[]): SeriesPreview | null | undefined {
  const [a, b] = memberIds
  const pair = memberIds.length === 2 && a !== undefined && b !== undefined
  const { seasons, tournaments } = useCareerData()
  return useMemo(() => (seasons && pair ? seriesPreview(headToHead(seasons, tournaments, a, b)) : undefined), [seasons, tournaments, pair, a, b])
}
