import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/** What a polled request looks like to a caller — same shape as useAsyncData, plus it keeps going. */
export interface Polled<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  /** Fetch now, out of turn (a Refresh button); the next tick then waits a full interval from it. */
  refresh: () => void
  /** True while a `refresh()` is in flight, for the button's own feedback. */
  refreshing: boolean
}

interface Resolved<T> {
  key: string
  data?: T
  error?: Error
}

/** `manual` is true only for a `refresh()` — the caller may want a fresher read for that one. */
type Fetcher<T> = (manual: boolean) => Promise<T>

interface Latest<T> {
  fetcher: Fetcher<T>
  isFinal: ((value: T) => boolean) | undefined
  intervalMs: number
}

interface LoopCallbacks<T> {
  resolve: (update: (prev: Resolved<T> | undefined) => Resolved<T> | undefined) => void
  settledManual: () => void
}

/**
 * The loop itself, outside React. Each request gets a sequence number so an answer that arrives
 * after a newer one (a Refresh racing the timer, or the tab-visible refetch) can't overwrite it, and
 * only the newest request schedules the next tick, so there is never more than one timer running.
 */
function startLoop<T>(key: string, latest: RefObject<Latest<T>>, { resolve, settledManual }: LoopCallbacks<T>) {
  let cancelled = false
  let done = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let issued = 0
  let applied = 0

  function schedule() {
    if (cancelled || done) return
    clearTimeout(timer)
    timer = setTimeout(() => void poll(false), latest.current.intervalMs)
  }

  /** One request; a stale answer (a newer one already applied) or a cancelled loop is dropped. */
  async function read(id: number, manual: boolean) {
    try {
      const next = await latest.current.fetcher(manual)
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

  async function poll(manual: boolean) {
    if (cancelled || done) return
    // Hidden tab: skip the request, but keep the loop alive so it resumes on its own.
    if (!manual && document.visibilityState === 'hidden') return schedule()
    const id = ++issued
    clearTimeout(timer)
    await read(id, manual)
    if (manual && !cancelled) settledManual()
    if (id === issued) schedule()
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') void poll(false)
  }
  document.addEventListener('visibilitychange', onVisible)
  void poll(false)
  return {
    /** False when there is nothing to refresh (the value is final), so the caller can say so. */
    refresh: (): boolean => {
      if (cancelled || done) return false
      void poll(true)
      return true
    },
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
 * `active`. `refresh()` fetches out of turn.
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
export function usePoll<T>(key: string, fetcher: Fetcher<T>, active: boolean, intervalMs: number, isFinal?: (value: T) => boolean): Polled<T> {
  const [resolved, setResolved] = useState<Resolved<T>>()
  const [refreshingKey, setRefreshingKey] = useState<string>()
  const loop = useRef<ReturnType<typeof startLoop<T>>>(undefined)

  // These are fresh closures/values every render; the poll loop must not restart for that, so it
  // reads them through a ref and keys its lifetime on the request identity instead.
  // Declared before the loop's effect, so it has run by the time the loop's first poll reads it.
  const latest = useRef<Latest<T>>({ fetcher, isFinal, intervalMs })
  useEffect(() => {
    latest.current = { fetcher, isFinal, intervalMs }
  })

  useEffect(() => {
    if (!active) return
    const current = startLoop(key, latest, { resolve: setResolved, settledManual: () => setRefreshingKey(undefined) })
    loop.current = current
    return () => {
      current.stop()
      if (loop.current === current) loop.current = undefined
    }
  }, [key, active])

  const refresh = useCallback(() => {
    if (loop.current?.refresh()) setRefreshingKey(key)
  }, [key])

  const refreshing = refreshingKey === key
  if (active && resolved?.key === key) {
    return { data: resolved.data, error: resolved.error, loading: false, refresh, refreshing }
  }
  return { data: undefined, error: undefined, loading: active, refresh, refreshing }
}
