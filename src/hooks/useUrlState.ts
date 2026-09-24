import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * The params as updated by any write still inside the current task, or undefined once it's over.
 *
 * react-router's `setSearchParams(prev => …)` hands `prev` the params as of the last RENDER, not
 * as of the last write, so two writes from one click don't compose: the second starts from the old
 * URL and quietly undoes the first. Standings did exactly that (pick Masters → tier set, then
 * scope set from the stale URL → back to Premier). Every write therefore starts from here when a
 * write is still pending. It's module-level because the writers are separate hook instances (the
 * season picker's `tier`, the page's `scope`), and it clears itself on the next microtask, after
 * the handler that made the writes has finished.
 */
let pending: URLSearchParams | undefined

/**
 * Write several query params in one navigation (replace, so picker changes don't spam history).
 * A null value removes the param. The ONE place this app writes search params — use it (or
 * useUrlState, which is built on it) rather than calling `setSearchParams` directly.
 */
export function useUpdateUrlParams(): (changes: Record<string, string | null>) => void {
  const [params, setParams] = useSearchParams()
  return useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(pending ?? params)
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      if (pending === undefined) queueMicrotask(() => (pending = undefined))
      pending = next
      setParams(next, { replace: true })
    },
    [params, setParams],
  )
}

/**
 * One uniform helper for query-param state (the old app used URL state inconsistently). Reads a
 * single param with a fallback and writes it back.
 */
export function useUrlState(key: string, fallback: string): [string, (value: string) => void] {
  const [params] = useSearchParams()
  const update = useUpdateUrlParams()
  const value = params.get(key) ?? fallback
  const setValue = useCallback((next: string) => update({ [key]: next }), [key, update])
  return [value, setValue]
}
