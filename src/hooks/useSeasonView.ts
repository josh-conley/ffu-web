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
/**
 * @param extraYears Years to offer beyond the completed-season manifest — the Drafts page passes the
 *        LIVE season, which has a draft order on Sleeper but no backfilled data. Deliberately opt-in
 *        per page: Standings/Matchups have nothing to show for a season that hasn't been played.
 */
export function useSeasonPicker(extraYears: string[] = []): SeasonPicker {
  const { data: manifest, loading: manifestLoading, error: manifestError } = useSeasons()
  const years = manifest ? [...new Set([...extraYears, ...manifest.map((s) => s.year)])].sort().reverse() : []

  const [yearParam, setYear] = useUrlState('year', '')
  const [tierParam, setTier] = useUrlState('tier', 'PREMIER')

  // Which year to open on: the newest that has something to show. A season's file now exists from
  // the day its leagues are created, so "newest" alone could land on a season with nothing in it —
  // but a published fixture list counts, which is why the season being played wins from week 1
  // rather than only once results exist. Both flags are absent on every migrated row and read as
  // true, so the backfilled years are unaffected. Pages passing `extraYears` (Drafts) always take
  // the newest, since a draft board is worth showing before any of the season is.
  const showable = manifest
    ? years.filter((y) => manifest.some((s) => s.year === y && (s.hasGames !== false || s.hasSchedule === true)))
    : []
  const fallback = (extraYears.length > 0 ? years[0] : showable[0] ?? years[0]) ?? ''
  const year = years.includes(yearParam) ? yearParam : fallback
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
