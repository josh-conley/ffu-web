import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { LIVE_LEAGUE_IDS } from '@/config'
import { pageTitle } from '@/components/pageTitle'
import { useSeasonPicker } from './useSeasonView'

const NO_EXTRA_YEARS: string[] = []
// Drafts also offers the live season (see Drafts.tsx), so its default year can differ.
const LIVE_YEARS = Object.keys(LIVE_LEAGUE_IDS)

/**
 * Keeps `document.title` in step with the route. Mounted once, in the Layout. Season-scoped pages
 * resolve their year/tier through the same picker the page uses, so the tab names the season on
 * screen even when the URL carries no `?year=` (the picker shares the page's cached manifest).
 */
export function usePageTitle(): void {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const picker = useSeasonPicker(pathname === '/drafts' ? LIVE_YEARS : NO_EXTRA_YEARS)
  const title = pageTitle(pathname, params, picker.ready ? { year: picker.year, tier: picker.tier } : undefined)

  useEffect(() => {
    document.title = title
  }, [title])
}
