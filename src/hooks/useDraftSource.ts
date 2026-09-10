import type { Tier } from '@/config'
import type { DraftData, DraftPick, LiveDraftOrder } from '@/data'
import { useDraft } from './useLeagueData'
import { isLiveDraftYear } from './useDraftOrder'
import { useLiveDraft } from './useLiveDraft'

export interface DraftSource {
  /** True when the board must come from Sleeper because no completed draft has been written yet. */
  live: boolean
  draft: DraftData | null | undefined
  order: LiveDraftOrder | undefined
  picks: DraftPick[]
  loading: boolean
  error: Error | undefined
}

/**
 * Where a year's draft board comes from: the backfilled file if there is one, Sleeper if there
 * isn't.
 *
 * The static file is tried FIRST, even for a year configured as live. `getDraft` is an optional
 * load, so a missing file resolves to null rather than throwing, and only then does the live path
 * turn on. That ordering is what lets draft night work with no file present and lets the finished
 * board take over by itself once `npm run backfill-drafts` writes one — with no config change and,
 * crucially, no polling Sleeper every few seconds to redraw a board that can no longer change.
 */
export function useDraftSource(tier: Tier, year: string, ready: boolean): DraftSource {
  const { data: draft, loading, error } = useDraft(tier, year, ready)
  const live = isLiveDraftYear(year) && !loading && draft === null
  const { order, picks, loading: orderLoading, error: orderError } = useLiveDraft(tier, year, ready && live)
  return {
    live,
    draft,
    order,
    picks,
    loading: ready && (loading || (live && orderLoading)),
    error: live ? orderError : error,
  }
}
