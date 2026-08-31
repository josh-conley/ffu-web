import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS } from '@/config'
import type { LiveDraftOrder } from '@/data'
import { fetchDraftOrder } from '@/data'
import { usePoll } from './usePoll'

/**
 * How often the draft object itself is re-read. Slower than the picks poll: the only things that
 * change here are the status flipping to `drafting`, a late order change, or a new start time.
 */
const ORDER_POLL_MS = 30_000

/**
 * One live league's draft order, straight from Sleeper. Returns `undefined` for any year/tier that
 * isn't a configured live league — a completed season's draft comes from the provider (`useDraft`)
 * instead, so callers branch on which of the two they got.
 *
 * It is polled rather than fetched once, so a tab left open before the draft (the normal case — the
 * page goes up hours early) picks up the start on its own, and stops once the draft is complete.
 *
 * Unlike the home page's `useDraftSchedules`, errors are NOT swallowed: this is the whole content of
 * the page section that asks for it, so a failure should say so rather than render an empty board.
 * Once a good order is in hand a later failed poll is ignored, though — a blip shouldn't tear the
 * board down mid-draft.
 */
export function useDraftOrder(tier: Tier, year: string, enabled = true): { order: LiveDraftOrder | undefined; loading: boolean; error: Error | undefined } {
  const leagueId = LIVE_LEAGUE_IDS[year]?.[tier]
  const active = enabled && leagueId !== undefined

  const { data, loading, error } = usePoll(
    `draft-order:${year}:${tier}`,
    () => fetchDraftOrder(tier, year, leagueId as string),
    active,
    ORDER_POLL_MS,
    (order) => order.status === 'complete',
  )

  return { order: data, loading, error }
}

/** True when `year` is a live (configured-on-Sleeper, not yet backfilled) season. */
export function isLiveDraftYear(year: string): boolean {
  return LIVE_LEAGUE_IDS[year] !== undefined
}
