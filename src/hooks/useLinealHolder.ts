import { useMemo } from 'react'
import { linealHolderGoingInto } from '@/selectors'
import { useAllSeasons } from './useLeagueData'

/**
 * Who carries the lineal belt into `week` of `year` (see `linealHolderGoingInto`) — the team whose
 * game that week puts the title on the line. Undefined while loading, when no week is given, or
 * when the file can't say for certain.
 */
export function useLinealHolder(year: string | undefined, week: number | undefined): string | undefined {
  const { data: seasons } = useAllSeasons()
  return useMemo(
    () => (seasons && year !== undefined && week !== undefined ? (linealHolderGoingInto(seasons, year, week) ?? undefined) : undefined),
    [seasons, year, week],
  )
}
