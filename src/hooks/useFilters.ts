import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

// A small reusable filter layer (Charter DRY): declare typed FilterDefs per view; the hook keeps
// the active values in the URL (shareable, like the rest of the app) and applies the predicates.
// Decoupled from DataTable on purpose, so the same defs can later filter a board / cards / anything.

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDef<T> {
  /** URL param key + identity. */
  key: string
  label: string
  options: FilterOption[]
  /** Called only for the active (non-empty) value; AND-ed across all active filters. */
  predicate: (row: T, value: string) => boolean
}

/** Pure filter application — every active filter must pass (AND). Inactive (empty) filters pass. */
export function applyFilters<T>(defs: FilterDef<T>[], values: Record<string, string>, rows: T[]): T[] {
  return rows.filter((row) =>
    defs.every((def) => {
      const value = values[def.key]
      return !value || def.predicate(row, value)
    }),
  )
}

export interface FilterControls<T> {
  /** Rows after applying the active filters. */
  rows: T[]
  /** Active values by key (absent/empty key = "All"). */
  values: Record<string, string>
  setValue: (key: string, value: string) => void
  clear: () => void
  activeCount: number
}

/** URL-driven filtering over `rows` for the given `defs`. Memoize `defs` in the caller. */
export function useFilters<T>(defs: FilterDef<T>[], rows: T[]): FilterControls<T> {
  const [params, setParams] = useSearchParams()

  const values = useMemo(() => {
    const v: Record<string, string> = {}
    for (const def of defs) {
      const value = params.get(def.key)
      if (value) v[def.key] = value
    }
    return v
  }, [params, defs])

  const filtered = useMemo(() => applyFilters(defs, values, rows), [defs, values, rows])

  const setValue = useCallback(
    (key: string, value: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const clear = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const def of defs) next.delete(def.key)
        return next
      },
      { replace: true },
    )
  }, [setParams, defs])

  return { rows: filtered, values, setValue, clear, activeCount: Object.keys(values).length }
}
