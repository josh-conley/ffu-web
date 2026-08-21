import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS } from '@/config'
import type { LiveDraftOrder } from '@/data'
import { fetchDraftOrder } from '@/data'
import { useAsyncData } from './useAsyncData'

/**
 * One live league's draft order, straight from Sleeper. Returns `undefined` for any year/tier that
 * isn't a configured live league — a completed season's draft comes from the provider (`useDraft`)
 * instead, so callers branch on which of the two they got.
 *
 * Unlike the home page's `useDraftSchedules`, errors are NOT swallowed: this is the whole content of
 * the page section that asks for it, so a failure should say so rather than render an empty board.
 */
export function useDraftOrder(tier: Tier, year: string, enabled = true): { order: LiveDraftOrder | undefined; loading: boolean; error: Error | undefined } {
  const leagueId = LIVE_LEAGUE_IDS[year]?.[tier]
  const active = enabled && leagueId !== undefined

  const { data, loading, error } = useAsyncData(
    `draft-order:${year}:${tier}`,
    () => fetchDraftOrder(tier, year, leagueId as string),
    active,
  )

  return { order: data, loading: active && loading, error }
}

/** True when `year` is a live (configured-on-Sleeper, not yet backfilled) season. */
export function isLiveDraftYear(year: string): boolean {
  return LIVE_LEAGUE_IDS[year] !== undefined
}
