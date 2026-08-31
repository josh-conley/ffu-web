import type { DraftPick } from '@/data'
import { fetchDraftPicks } from '@/data'
import { usePoll } from './usePoll'

// Sleeper has no push API, so the board polls — at one of two speeds, because the difference
// between them is three hours of draft night versus the other 364 days.
//
// LIVE is deliberately aggressive: the whole point of the board is that a pick appears on it about
// when it appears in the app. Note there is no back-off while the draft is quiet, which is the
// tempting move and the wrong one — a quiet draft is a clock running on someone, i.e. exactly the
// moment everyone is staring at the board waiting for the pick to land. The quiet stretch is when
// latency is most visible, not least.
const LIVE_POLL_MS = 5_000
// Idle: a board left open before the draft, or one whose draft was postponed. Kept slow and cheap;
// the draft object is polled separately and is what notices the draft starting.
const IDLE_POLL_MS = 60_000

/**
 * Picks made so far, refreshed while the draft is under way. The poll loop (hidden-tab pause,
 * keep-last-good, stop-when-final) lives in usePoll; the only things specific to picks are knowing
 * when the board is full — at which point the draft is over and there is nothing left to ask for —
 * and how hard to push while it isn't.
 */
export function useLiveDraftPicks(draftId: string | null, active: boolean, expectedPicks: number, live: boolean): DraftPick[] {
  const { data } = usePoll(
    `draft-picks:${draftId ?? ''}`,
    () => fetchDraftPicks(draftId as string),
    active && draftId !== null,
    live ? LIVE_POLL_MS : IDLE_POLL_MS,
    (picks) => expectedPicks > 0 && picks.length >= expectedPicks,
  )
  return data ?? []
}
