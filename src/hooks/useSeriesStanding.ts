import { useMemo } from 'react'
import { headToHead, seriesStanding, type SeriesStanding } from '@/selectors'
import { useCareerData } from './useLeagueData'

/**
 * The all-time series between two teams, across every tier and season on file (the same record the
 * Members page's Compare shows). Undefined until the seasons load. The in-progress week isn't on
 * file until the weekly refresh, so a live game's own result never counts toward its tag. Takes the
 * game's member list as-is; anything but a pair (malformed data) yields no tag rather than a wrong one.
 */
export function useSeriesStanding(memberIds: readonly string[]): SeriesStanding | undefined {
  const [a, b] = memberIds
  const pair = memberIds.length === 2 && a !== undefined && b !== undefined
  const { seasons, tournaments } = useCareerData()
  return useMemo(() => (seasons && pair ? seriesStanding(headToHead(seasons, tournaments, a, b)) : undefined), [seasons, tournaments, pair, a, b])
}
