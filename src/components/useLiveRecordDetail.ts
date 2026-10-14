import { useMemo } from 'react'
import type { LiveSeasonData } from '@/data'
import { standingsThroughPreviousWeek, uprThroughPreviousWeek } from '@/selectors'
import { recordRatingLabel } from './format'

/**
 * A live matchup card's line under each team's name: record and UPR (PPG until the season has a
 * UPR) through week `through`, the same numbers as the Standings page. Takes several leagues at
 * once for the Cup, whose games pair teams across them; each team reads its own league. Callers
 * pass a stable `seasons` array.
 */
export function useLiveRecordDetail(seasons: readonly LiveSeasonData[], through: number): (memberId: string) => string | undefined {
  const labels = useMemo(() => {
    const out = new Map<string, string | undefined>()
    for (const data of seasons) {
      const upr = uprThroughPreviousWeek(data, through)
      for (const row of standingsThroughPreviousWeek(data, through)) out.set(row.totals.memberId, recordRatingLabel(row.totals, upr.get(row.totals.memberId)))
    }
    return out
  }, [seasons, through])
  return (memberId) => labels.get(memberId)
}
