import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * One uniform helper for query-param state (the old app used URL state inconsistently). Reads a
 * single param with a fallback and writes it back (replace, so picker changes don't spam history).
 */
export function useUrlState(key: string, fallback: string): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? fallback

  const setValue = useCallback(
    (next: string) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev)
          updated.set(key, next)
          return updated
        },
        { replace: true },
      )
    },
    [key, setParams],
  )

  return [value, setValue]
}
