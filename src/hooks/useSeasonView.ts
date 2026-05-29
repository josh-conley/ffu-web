import type { SeasonData } from '@/data'
import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { useSeason, useSeasons } from './useLeagueData'
import { useUrlState } from './useUrlState'

export interface SeasonView {
  years: string[]
  year: string
  tier: Tier
  setYear: (year: string) => void
  setTier: (tier: Tier) => void
  season: SeasonData | undefined
  loading: boolean
  error: Error | undefined
}

/**
 * The shared "manifest → pick year/tier (URL state) → load that season" flow used by every
 * season-scoped page (Standings, Matchups, …). Defaults to the latest year + Premier, clamps the
 * URL params to what actually exists (ESPN years have no Masters), and skips the season fetch
 * until the manifest resolves so we never request an empty path.
 */
export function useSeasonView(): SeasonView {
  const { data: manifest, loading: manifestLoading, error: manifestError } = useSeasons()
  const years = manifest ? [...new Set(manifest.map((s) => s.year))].sort().reverse() : []

  const [yearParam, setYear] = useUrlState('year', '')
  const [tierParam, setTier] = useUrlState('tier', 'PREMIER')

  const year = years.includes(yearParam) ? yearParam : (years[0] ?? '')
  const tiers = year === '' ? [] : tiersForYear(year)
  const tier = (tiers.includes(tierParam as Tier) ? tierParam : (tiers[0] ?? 'PREMIER')) as Tier

  const ready = year !== ''
  const { data: season, loading: seasonLoading, error: seasonError } = useSeason(tier, year, ready)

  return {
    years,
    year,
    tier,
    setYear,
    setTier: (t) => setTier(t),
    season,
    loading: manifestLoading || (ready && seasonLoading),
    error: manifestError ?? seasonError,
  }
}
