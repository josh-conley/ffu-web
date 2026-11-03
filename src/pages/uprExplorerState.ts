import { UPR_MIN_WEEKS } from '@/selectors'
import { useUpdateUrlParams, useUrlState } from '@/hooks/useUrlState'
import { useYearRange } from '@/hooks/useYearRange'

// URL-backed state for the UPR Explorer (a .ts module, no components, like rosterBuildFilters), so
// any view of it can be linked or reopened: `?week=8&league=PREMIER&member=ffu-001&order=low`
// plus the shared `from`/`to` year range. Anything missing or malformed falls back to the default.

export type UprOrder = 'high' | 'low'

/** The week from `week=N`, clamped to UPR_MIN_WEEKS..maxWeek; the whole season when absent. */
function weekFrom(param: string, maxWeek: number): number {
  const n = Number(param)
  if (param === '' || !Number.isInteger(n)) return maxWeek
  return Math.max(UPR_MIN_WEEKS, Math.min(n, maxWeek))
}

export function useUprExplorerState(years: string[], maxWeek: number) {
  const [weekParam] = useUrlState('week', '')
  const [league, setLeague] = useUrlState('league', 'ALL')
  const [member] = useUrlState('member', '')
  const [orderParam, setOrder] = useUrlState('order', 'high')
  const yearRange = useYearRange(years)
  const update = useUpdateUrlParams()

  const week = weekFrom(weekParam, maxWeek)
  // The defaults (the whole season, every member) leave the URL rather than linger in it.
  const setWeek = (n: number) => update({ week: n >= maxWeek ? null : String(n) })
  const setMember = (ffuId: string) => update({ member: ffuId || null })
  const reset = () => update({ week: null, league: null, member: null, order: null, from: null, to: null })

  return {
    week,
    setWeek,
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
