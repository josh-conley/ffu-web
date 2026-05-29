import type { Tier } from '@/config/types'
import { provider } from '@/data'
import { useAsyncData } from './useAsyncData'

// Thin wrappers over the provider. Components consume these (+ selectors); they never touch
// the provider or `fetch` directly (Charter §6).

export function useSeasons() {
  return useAsyncData('seasons', () => provider.getSeasons())
}

export function useSeason(tier: Tier, year: string, enabled = true) {
  return useAsyncData(`season:${tier}:${year}`, () => provider.getSeason(tier, year), enabled)
}

export function useDraft(tier: Tier, year: string, enabled = true) {
  return useAsyncData(`draft:${tier}:${year}`, () => provider.getDraft(tier, year), enabled)
}
