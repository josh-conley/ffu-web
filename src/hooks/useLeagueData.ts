import type { Tier } from '@/config/types'
import type { SeasonLineups } from '@/data'
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

export function useSeason(tier: Tier, year: string, enabled = true) {
  return useAsyncData(`season:${tier}:${year}`, () => provider.getSeason(tier, year), enabled)
}

export function useDraft(tier: Tier, year: string, enabled = true) {
  return useAsyncData(`draft:${tier}:${year}`, () => provider.getDraft(tier, year), enabled)
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
