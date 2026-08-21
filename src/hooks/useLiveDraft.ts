import type { Tier } from '@/config'
import type { DraftPick, LiveDraftOrder } from '@/data'
import { useDraftOrder } from './useDraftOrder'
import { useLiveDraftPicks } from './useLiveDraftPicks'

export interface LiveDraft {
  order: LiveDraftOrder | undefined
  /** Picks made so far — empty before the draft, filling in as it runs. */
  picks: DraftPick[]
  loading: boolean
  error: Error | undefined
}

/**
 * A live season's draft: the order (one fetch) plus its picks (polled while it runs). Composed here
 * rather than in the page so the page stays a thin composition — the two hooks are separate because
 * the order is fetched once and the picks are not.
 */
export function useLiveDraft(tier: Tier, year: string, enabled: boolean): LiveDraft {
  const { order, loading, error } = useDraftOrder(tier, year, enabled)
  const expectedPicks = (order?.slots.length ?? 0) * (order?.rounds ?? 0)
  // Poll any live draft that isn't already finished, so the board comes alive the moment the draft
  // starts without anyone reloading the page.
  const polling = enabled && order !== undefined && order.status !== 'complete'
  const picks = useLiveDraftPicks(order?.draftId ?? null, polling, expectedPicks)
  return { order, picks, loading, error }
}
