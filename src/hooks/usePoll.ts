import { useEffect, useRef, useState } from 'react'

/** What a polled request looks like to a caller — same shape as useAsyncData, plus it keeps going. */
export interface Polled<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
}

interface Resolved<T> {
  key: string
  data?: T
  error?: Error
}

/**
 * Re-fetch something on an interval for as long as it can still change.
 *
 * Used by the live draft, where Sleeper has no push API. Polling stops on its own in three ways, so
 * an open tab can't sit there hammering Sleeper: it pauses while the tab is hidden (and refreshes
 * immediately on return, so you never stare at a stale board), it stops once `isFinal` says the
 * value can no longer change, and the caller stops it entirely with `active`.
 *
 * A failed poll keeps the last good value rather than blanking the UI — a dropped request mid-draft
 * should be invisible. An error is only reported when there is nothing good to show yet, i.e. the
 * very first fetch failed.
 */
export function usePoll<T>(
  key: string,
  fetcher: () => Promise<T>,
  active: boolean,
  intervalMs: number,
  isFinal?: (value: T) => boolean,
): Polled<T> {
  const [resolved, setResolved] = useState<Resolved<T>>()

  // `fetcher`/`isFinal` are fresh closures every render; the poll loop must not restart for that,
  // so it reads them through a ref and keys its lifetime on the request identity instead.
  const latest = useRef({ fetcher, isFinal })
  latest.current = { fetcher, isFinal }

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let done = false

    // Declared before `timer` deliberately: a hoisted function can close over the const below,
    // which keeps the timer handle assign-once (and the linter happy).
    async function poll() {
      if (cancelled || done || document.visibilityState === 'hidden') return
      try {
        const next = await latest.current.fetcher()
        if (cancelled) return
        setResolved({ key, data: next })
        if (latest.current.isFinal?.(next)) {
          done = true
          clearInterval(timer)
        }
      } catch (err: unknown) {
        // Only surface a failure when we have nothing to show; otherwise the next tick retries.
        if (cancelled) return
        setResolved((prev) =>
          prev?.key === key && prev.data !== undefined
            ? prev
            : { key, error: err instanceof Error ? err : new Error(String(err)) },
        )
      }
    }

    const timer = setInterval(() => void poll(), intervalMs)
    document.addEventListener('visibilitychange', poll)
    void poll()
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [key, active, intervalMs])

  if (active && resolved?.key === key) {
    return { data: resolved.data, error: resolved.error, loading: false }
  }
  return { data: undefined, error: undefined, loading: active }
}
