import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/** What a polled request looks like to a caller — same shape as useAsyncData, plus it keeps going. */
export interface Polled<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  /** Read now rather than waiting for the next tick (a Refresh button); settles once it's applied. */
  refresh: () => Promise<void>
}

interface Resolved<T> {
  key: string
  data?: T
  error?: Error
}

export interface PollOptions<T> {
  /** Stop for good once the value can no longer change. */
  isFinal?: (value: T) => boolean
  /** Keep polling while the tab is hidden: for a view that is still on screen somewhere else (the
   *  popped-out matchup floats over other tabs, and its opener is hidden the whole time). */
  whileHidden?: boolean
}

interface Latest<T> extends PollOptions<T> {
  fetcher: () => Promise<T>
  intervalMs: number
}

type Resolve<T> = (update: (prev: Resolved<T> | undefined) => Resolved<T> | undefined) => void

/**
 * The loop itself, outside React. Each request gets a sequence number so an answer that arrives
 * after a newer one (the tab-visible refetch racing a tick) can't overwrite it, and
 * only the newest request schedules the next tick, so there is never more than one timer running.
 */
function startLoop<T>(key: string, latest: RefObject<Latest<T>>, resolve: Resolve<T>) {
  let cancelled = false
  let done = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let issued = 0
  let applied = 0

  function schedule() {
    if (cancelled || done) return
    clearTimeout(timer)
    timer = setTimeout(() => void poll(), latest.current.intervalMs)
  }

  /** One request; a stale answer (a newer one already applied) or a cancelled loop is dropped. */
  async function read(id: number) {
    try {
      const next = await latest.current.fetcher()
      if (cancelled || id < applied) return
      applied = id
      resolve(() => ({ key, data: next }))
      if (latest.current.isFinal?.(next)) done = true
    } catch (err: unknown) {
      if (cancelled) return
      // Only surface a failure when we have nothing to show; otherwise the next tick retries.
      resolve((prev) => (prev?.key === key && prev.data !== undefined ? prev : { key, error: err instanceof Error ? err : new Error(String(err)) }))
    }
  }

  /** `now`: asked for by the viewer, so it goes ahead even from a hidden tab. */
  async function poll(now = false) {
    if (cancelled || done) return
    // Hidden tab: skip the request, but keep the loop alive so it resumes on its own.
    if (!now && document.visibilityState === 'hidden' && !latest.current.whileHidden) return schedule()
    const id = ++issued
    clearTimeout(timer)
    await read(id)
    if (id === issued) schedule()
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') void poll()
  }
  document.addEventListener('visibilitychange', onVisible)
  void poll()
  return {
    // The read restarts the interval, so a refresh is never followed straight away by a tick.
    refresh: () => poll(true),
    stop: () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    },
  }
}

/**
 * Re-fetch something on an interval for as long as it can still change.
 *
 * Used by the live draft and the home page's live scores, where Sleeper has no push API. Polling
 * stops on its own in three ways, so an open tab can't sit there hammering Sleeper: it pauses while
 * the tab is hidden (and refreshes immediately on return, so you never stare at a stale board), it
 * stops once `isFinal` says the value can no longer change, and the caller stops it entirely with
 * `active`. `whileHidden` opts out of the first, for a view shown outside the tab. `refresh` reads
 * straight away, for a viewer who doesn't want to wait out the interval.
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
export function usePoll<T>(key: string, fetcher: () => Promise<T>, active: boolean, intervalMs: number, options: PollOptions<T> = {}): Polled<T> {
  const [resolved, setResolved] = useState<Resolved<T>>()

  // These are fresh closures/values every render; the poll loop must not restart for that, so it
  // reads them through a ref and keys its lifetime on the request identity instead.
  // Declared before the loop's effect, so it has run by the time the loop's first poll reads it.
  const latest = useRef<Latest<T>>({ ...options, fetcher, intervalMs })
  useEffect(() => {
    latest.current = { ...options, fetcher, intervalMs }
  })

  const loop = useRef<ReturnType<typeof startLoop<T>>>(undefined)
  useEffect(() => {
    if (!active) return
    const started = startLoop(key, latest, setResolved)
    loop.current = started
    return () => {
      started.stop()
      loop.current = undefined
    }
  }, [key, active])
  const refresh = useCallback(async () => loop.current?.refresh(), [])

  if (active && resolved?.key === key) {
    return { data: resolved.data, error: resolved.error, loading: false, refresh }
  }
  return { data: undefined, error: undefined, loading: active, refresh }
}
