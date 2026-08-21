import { useEffect, useState } from 'react'
import type { DraftPick } from '@/data'
import { fetchDraftPicks } from '@/data'

/** Sleeper has no push API, so the board polls. A pick takes far longer than this to make. */
const POLL_MS = 12_000

/**
 * Picks made so far, refreshed while the draft is under way.
 *
 * Polling stops on its own in three ways, so an open tab can't sit there hammering Sleeper: it
 * pauses while the tab is hidden (and refreshes immediately on return, so you never stare at a
 * stale board), it stops once the board is full, and it never starts for a draft that is already
 * complete. A failed poll keeps the last good picks rather than blanking the board — a dropped
 * request mid-draft should be invisible.
 */
export function useLiveDraftPicks(draftId: string | null, active: boolean, expectedPicks: number): DraftPick[] {
  const [picks, setPicks] = useState<DraftPick[]>([])

  useEffect(() => {
    if (!active || draftId === null) return
    let cancelled = false
    let done = false

    // Declared before `timer` deliberately: a hoisted function can close over the const below,
    // which keeps the timer handle assign-once (and the linter happy).
    async function poll() {
      if (cancelled || done || document.visibilityState === 'hidden') return
      try {
        const next = await fetchDraftPicks(draftId as string)
        if (cancelled) return
        setPicks(next)
        // Board full: the draft is over, so stop rather than poll a finished draft forever.
        if (expectedPicks > 0 && next.length >= expectedPicks) {
          done = true
          clearInterval(timer)
        }
      } catch {
        // Keep whatever we last had; the next tick will try again.
      }
    }

    const timer = setInterval(() => void poll(), POLL_MS)
    document.addEventListener('visibilitychange', poll)
    void poll()
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [draftId, active, expectedPicks])

  return picks
}
