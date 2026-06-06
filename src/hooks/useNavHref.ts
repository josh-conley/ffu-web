import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { NavItem } from '@/components/nav'

/**
 * Builds the href for a nav item, carrying the current season context (`?year=&tier=`) onto
 * season-scoped destinations. This lets a visitor explore one season across Standings / Matchups /
 * Drafts without it snapping back to the latest season on every nav click. Non-season pages get a
 * bare path (and an unset year/tier simply falls through to the page's own latest-season default).
 */
export function useNavHref(): (item: NavItem) => string {
  const [params] = useSearchParams()
  return useCallback(
    (item: NavItem) => {
      if (!item.seasonScoped) return item.to
      const carried = new URLSearchParams()
      const year = params.get('year')
      const tier = params.get('tier')
      if (year) carried.set('year', year)
      if (tier) carried.set('tier', tier)
      const qs = carried.toString()
      return qs ? `${item.to}?${qs}` : item.to
    },
    [params],
  )
}
