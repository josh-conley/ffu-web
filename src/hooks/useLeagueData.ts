import type { Tier } from '@/config/types'
import { CUP_INAUGURAL_YEAR } from '@/config'
import type { DraftData, SeasonLineups, Tournament } from '@/data'
import { provider } from '@/data'
import { useAsyncData } from './useAsyncData'

// Thin wrappers over the provider. Components consume these (+ selectors); they never touch
// the provider or `fetch` directly (Charter §6).

export function useSeasons() {
  return useAsyncData('seasons', () => provider.getSeasons())
}

/** Every season loaded (for all-time views like Records / All-Time Stats). */
export function useAllSeasons() {
  const { data: manifest, loading, error } = useSeasons()
  const all = useAsyncData(
    'all-seasons',
    () => Promise.all((manifest ?? []).map((s) => provider.getSeason(s.tier, s.year))),
    manifest !== undefined,
  )
  return {
    data: all.data,
    loading: loading || (manifest !== undefined && all.loading),
    error: error ?? all.error,
  }
}

/** Every tier's season file for ONE year (the Standings page's Union view of all 36 teams). */
export function useYearSeasons(year: string, enabled = true) {
  const { data: manifest, loading, error } = useSeasons()
  const all = useAsyncData(
    `year-seasons:${year}`,
    () => Promise.all((manifest ?? []).filter((s) => s.year === year).map((s) => provider.getSeason(s.tier, s.year))),
    enabled && manifest !== undefined,
  )
  return {
    data: all.data,
    loading: loading || (enabled && manifest !== undefined && all.loading),
    error: error ?? all.error,
  }
}

export function useSeason(tier: Tier, year: string, enabled = true) {
  return useAsyncData(`season:${tier}:${year}`, () => provider.getSeason(tier, year), enabled)
}

export function useDraft(tier: Tier, year: string, enabled = true) {
  return useAsyncData(`draft:${tier}:${year}`, () => provider.getDraft(tier, year), enabled)
}

/** Every draft the manifest advertises (for the cross-season Roster Build Stats view). */
export function useAllDrafts() {
  const { data: manifest, loading, error } = useSeasons()
  const all = useAsyncData(
    'all-drafts',
    async () => {
      const sources = (manifest ?? []).filter((s) => s.hasDraft)
      const loaded = await Promise.all(sources.map((s) => provider.getDraft(s.tier, s.year)))
      return loaded.filter((d): d is DraftData => d !== null)
    },
    manifest !== undefined,
  )
  return {
    data: all.data,
    loading: loading || (manifest !== undefined && all.loading),
    error: error ?? all.error,
  }
}

/** Every lineup file the manifest advertises (for career views like All-Time Stats efficiency). */
export function useAllLineups() {
  const { data: manifest, loading, error } = useSeasons()
  const all = useAsyncData(
    'all-lineups',
    async () => {
      const sources = (manifest ?? []).filter((s) => s.hasLineups)
      const loaded = await Promise.all(sources.map((s) => provider.getLineups(s.tier, s.year)))
      return loaded.filter((l): l is SeasonLineups => l !== null)
    },
    manifest !== undefined,
  )
  return {
    data: all.data,
    loading: loading || (manifest !== undefined && all.loading),
    error: error ?? all.error,
  }
}

/** A season's lineups (lazy — only fetched when `enabled`, e.g. once a lineup modal opens). */
export function useLineups(tier: Tier, year: string, enabled = true) {
  return useAsyncData(`lineups:${tier}:${year}`, () => provider.getLineups(tier, year), enabled)
}

/** The shared player id → name/position/team map (one fetch, cached by the provider). */
export function usePlayers(enabled = true) {
  return useAsyncData('players', () => provider.getPlayers(), enabled)
}

/**
 * Every season's FFU Cup, for career views whose prize money includes it. Asks only for the years
 * from the Cup's first season on, rather than probing every year the manifest lists; a year whose
 * Cup file isn't published yet simply has none.
 */
export function useAllTournaments() {
  const { data: manifest, loading, error } = useSeasons()
  const all = useAsyncData(
    'all-tournaments',
    async () => {
      const years = [...new Set((manifest ?? []).map((s) => s.year))].filter((y) => Number(y) >= Number(CUP_INAUGURAL_YEAR))
      const loaded = await Promise.all(years.map((y) => provider.getTournament(y)))
      return loaded.filter((t): t is Tournament => t !== null)
    },
    manifest !== undefined,
  )
  return {
    data: all.data,
    loading: loading || (manifest !== undefined && all.loading),
    error: error ?? all.error,
  }
}

const NO_TOURNAMENTS: Tournament[] = []

/**
 * Every season plus every Cup: what career prize money is computed from (see careerWinnings). One
 * loading and error for the pair, so a page can never render winnings that are missing their Cup
 * money while the tournaments are still on their way.
 */
export function useCareerData() {
  const seasons = useAllSeasons()
  const cups = useAllTournaments()
  return {
    seasons: seasons.data,
    tournaments: cups.data ?? NO_TOURNAMENTS,
    loading: seasons.loading || cups.loading,
    error: seasons.error ?? cups.error,
  }
}

/** A year's cross-tier tournament (null when none is defined for that year). */
export function useTournament(year: string, enabled = true) {
  return useAsyncData(`tournament:${year}`, () => provider.getTournament(year), enabled)
}
