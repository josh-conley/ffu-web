import type { SeasonData } from '@/data'
import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { useSeason, useSeasons } from './useLeagueData'
import { useUrlState } from './useUrlState'

export interface SeasonPicker {
  years: string[]
  year: string
  tier: Tier
  setYear: (year: string) => void
  setTier: (tier: Tier) => void
  /** True once the manifest has resolved and year/tier are valid (gate dependent fetches on this). */
  ready: boolean
  manifestLoading: boolean
  manifestError: Error | undefined
}

/**
 * Shared "manifest → pick year/tier (URL state)" flow for every season-scoped page. Defaults to
 * the latest year + Premier and clamps the URL params to what actually exists (ESPN years have no
 * Masters). Does NOT fetch the season — pages load whatever they need (season, draft, …) gated on
 * `ready`.
 */
export function useSeasonPicker(): SeasonPicker {
  const { data: manifest, loading: manifestLoading, error: manifestError } = useSeasons()
  const years = manifest ? [...new Set(manifest.map((s) => s.year))].sort().reverse() : []

  const [yearParam, setYear] = useUrlState('year', '')
  const [tierParam, setTier] = useUrlState('tier', 'PREMIER')

  const year = years.includes(yearParam) ? yearParam : (years[0] ?? '')
  const tiers = year === '' ? [] : tiersForYear(year)
  const tier = (tiers.includes(tierParam as Tier) ? tierParam : (tiers[0] ?? 'PREMIER')) as Tier

  return { years, year, tier, setYear, setTier: (t) => setTier(t), ready: year !== '', manifestLoading, manifestError }
}

export interface SeasonView extends Pick<SeasonPicker, 'years' | 'year' | 'tier' | 'setYear' | 'setTier'> {
  season: SeasonData | undefined
  loading: boolean
  error: Error | undefined
}

/** `useSeasonPicker` + the loaded season for that year/tier (Standings, Matchups). */
export function useSeasonView(): SeasonView {
  const picker = useSeasonPicker()
  const { data: season, loading, error } = useSeason(picker.tier, picker.year, picker.ready)
  return {
    years: picker.years,
    year: picker.year,
    tier: picker.tier,
    setYear: picker.setYear,
    setTier: picker.setTier,
    season,
    loading: picker.manifestLoading || (picker.ready && loading),
    error: picker.manifestError ?? error,
  }
}
