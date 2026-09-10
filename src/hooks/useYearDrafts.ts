import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import type { DraftData } from '@/data'
import { provider } from '@/data'
import { useAsyncData } from './useAsyncData'

/**
 * Every tier's draft for one year, for pages that compare the leagues against each other.
 *
 * A tier with no draft file resolves to null (getDraft is an optional load) and is dropped, so a
 * year part-way through draft season returns whatever is finished rather than failing.
 */
export function useYearDrafts(year: string, enabled = true): { drafts: DraftData[]; loading: boolean; error: Error | undefined } {
  const { data, loading, error } = useAsyncData(
    `year-drafts:${year}`,
    async () => {
      const tiers = tiersForYear(year) as Tier[]
      const loaded = await Promise.all(tiers.map((tier) => provider.getDraft(tier, year)))
      return loaded.filter((d): d is DraftData => d !== null)
    },
    enabled,
  )
  return { drafts: data ?? [], loading: enabled && loading, error }
}

/**
 * The ADP snapshot for a year, flattened for the selectors. Resolves to an empty map when no
 * snapshot was captured, so a page can render its FFU-only comparison without special-casing.
 */
export function useAdp(year: string, enabled = true): { adp: Record<string, number>; capturedAt: string | undefined } {
  const { data } = useAsyncData(`adp:${year}`, () => provider.getAdp(year), enabled)
  return { adp: data?.adp ?? {}, capturedAt: data?.capturedAt }
}
