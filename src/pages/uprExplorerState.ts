import { useMemo } from 'react'
import type { WeekWindow } from '@/selectors'
import { parseSpan, spanValue } from '@/hooks/useFilters'
import { useUpdateUrlParams, useUrlState } from '@/hooks/useUrlState'
import { useYearRange } from '@/hooks/useYearRange'

// URL-backed state for the UPR Explorer (a .ts module, no components, like rosterBuildFilters), so
// any view of it can be linked or reopened: `?weeks=1-8&league=PREMIER&member=ffu-001&order=low`
// plus the shared `from`/`to` year range. Anything missing or malformed falls back to the default.

export type UprOrder = 'high' | 'low'

/** The week span from `weeks=lo-hi`, clamped to 1..maxWeek; the whole season when absent. */
function windowFrom(param: string, maxWeek: number): WeekWindow {
  const [lo, hi] = parseSpan(param) ?? [1, maxWeek]
  return { from: Math.max(1, Math.min(lo, maxWeek)), to: Math.max(1, Math.min(hi, maxWeek)) }
}

export function useUprExplorerState(years: string[], maxWeek: number) {
  const [weeksParam] = useUrlState('weeks', '')
  const [league, setLeague] = useUrlState('league', 'ALL')
  const [member] = useUrlState('member', '')
  const [orderParam, setOrder] = useUrlState('order', 'high')
  const yearRange = useYearRange(years)
  const update = useUpdateUrlParams()

  const weeks = useMemo(() => windowFrom(weeksParam, maxWeek), [weeksParam, maxWeek])
  // The defaults (every week, every member) leave the URL rather than linger as `?weeks=`.
  const setWeeks = (from: number, to: number) => update({ weeks: spanValue(from, to, 1, maxWeek) || null })
  const setMember = (ffuId: string) => update({ member: ffuId || null })
  const reset = () => update({ weeks: null, league: null, member: null, order: null, from: null, to: null })

  return {
    weeks,
    setWeeks,
    league,
    setLeague,
    member,
    setMember,
    order: (orderParam === 'low' ? 'low' : 'high') as UprOrder,
    setOrder,
    yearRange,
    reset,
  }
}

export type UprExplorerState = ReturnType<typeof useUprExplorerState>
