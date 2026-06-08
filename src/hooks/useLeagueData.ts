import type { Tier } from '@/config/types'
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

/** A season's lineups (lazy — only fetched when `enabled`, e.g. once a lineup modal opens). */
export function useLineups(tier: Tier, year: string, enabled = true) {
  return useAsyncData(`lineups:${tier}:${year}`, () => provider.getLineups(tier, year), enabled)
}

/** The shared player id → name/position/team map (one fetch, cached by the provider). */
export function usePlayers(enabled = true) {
  return useAsyncData('players', () => provider.getPlayers(), enabled)
}
