import type { DraftPick } from '@/data'
import { fetchDraftPicks } from '@/data'
import { usePoll } from './usePoll'

/** Sleeper has no push API, so the board polls. A pick takes far longer than this to make. */
const POLL_MS = 12_000

/**
 * Picks made so far, refreshed while the draft is under way. The poll loop (hidden-tab pause,
 * keep-last-good, stop-when-final) lives in usePoll; the only thing specific to picks is knowing
 * when the board is full — at which point the draft is over and there is nothing left to ask for.
 */
export function useLiveDraftPicks(draftId: string | null, active: boolean, expectedPicks: number): DraftPick[] {
  const { data } = usePoll(
    `draft-picks:${draftId ?? ''}`,
    () => fetchDraftPicks(draftId as string),
    active && draftId !== null,
    POLL_MS,
    (picks) => expectedPicks > 0 && picks.length >= expectedPicks,
  )
  return data ?? []
}
