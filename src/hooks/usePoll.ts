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
 * `intervalMs` may change between renders — the live board polls hard while the draft is running
 * and barely at all when it isn't. The wait is therefore a chained timeout that reads the current
 * interval when it schedules the next tick, rather than a setInterval that would have to be torn
 * down and restarted (firing an extra fetch) every time the caller changed its mind.
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

  // These are fresh closures/values every render; the poll loop must not restart for that, so it
  // reads them through a ref and keys its lifetime on the request identity instead.
  const latest = useRef({ fetcher, isFinal, intervalMs })
  latest.current = { fetcher, isFinal, intervalMs }

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let done = false
    let timer: ReturnType<typeof setTimeout> | undefined

    function schedule() {
      if (cancelled || done) return
      clearTimeout(timer)
      timer = setTimeout(() => void poll(), latest.current.intervalMs)
    }

    async function poll() {
      if (cancelled || done) return
      // Hidden tab: skip the request, but keep the loop alive so it resumes on its own.
      if (document.visibilityState === 'hidden') return schedule()
      try {
        const next = await latest.current.fetcher()
        if (cancelled) return
        setResolved({ key, data: next })
        if (latest.current.isFinal?.(next)) {
          done = true
          clearTimeout(timer)
          return
        }
      } catch (err: unknown) {
        if (cancelled) return
        // Only surface a failure when we have nothing to show; otherwise the next tick retries.
        setResolved((prev) =>
          prev?.key === key && prev.data !== undefined
            ? prev
            : { key, error: err instanceof Error ? err : new Error(String(err)) },
        )
      }
      schedule()
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    void poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [key, active])

  if (active && resolved?.key === key) {
    return { data: resolved.data, error: resolved.error, loading: false }
  }
  return { data: undefined, error: undefined, loading: active }
}
