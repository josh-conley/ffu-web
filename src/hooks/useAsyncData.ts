import { useEffect, useState } from 'react'

export interface AsyncState<T> {
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
 * Subscribe a component to a provider call. `key` identifies the request (the provider already
 * dedupes/caches the underlying fetch). State is only ever set from the async resolution;
 * `loading` is derived by comparing the resolved key to the current key, so a key change shows
 * loading during render without a synchronous setState in the effect.
 */
export function useAsyncData<T>(key: string, fetcher: () => Promise<T>): AsyncState<T> {
  const [resolved, setResolved] = useState<Resolved<T>>()

  useEffect(() => {
    let active = true
    fetcher().then(
      (data) => active && setResolved({ key, data }),
      (err: unknown) => active && setResolved({ key, error: err instanceof Error ? err : new Error(String(err)) }),
    )
    return () => {
      active = false
    }
    // `fetcher` is a fresh closure each render; `key` is the stable request identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (resolved?.key === key) {
    return { data: resolved.data, error: resolved.error, loading: false }
  }
  return { data: undefined, error: undefined, loading: true }
}
