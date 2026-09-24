import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUpdateUrlParams } from './useUrlState'

// A small reusable filter layer (Charter DRY): declare typed FilterDefs per view; the hook keeps
// the active values in the URL (shareable, like the rest of the app) and applies the predicates.
// Decoupled from DataTable on purpose, so the same defs can later filter a board / cards / anything.

export interface FilterOption {
  value: string
  label: string
}

interface BaseFilter<T> {
  /** URL param key + identity. */
  key: string
  label: string
  /** Called only for the active (non-empty) value; AND-ed across all active filters. */
  predicate: (row: T, value: string) => boolean
}

/** Dropdown filter (the default). */
export interface SelectFilter<T> extends BaseFilter<T> {
  type?: 'select'
  options: FilterOption[]
}

/** Slider filter — "at least N". Inactive (shows all) when the value is at `min`. */
export interface RangeFilter<T> extends BaseFilter<T> {
  type: 'range'
  min: number
  max: number
  step?: number
}

/**
 * Two-ended range filter — "between LO and HI". Inactive (shows all) when the span is the whole
 * range, which is also when the value is cleared from the URL so it doesn't count as active.
 *
 * The value is stored as `"lo-hi"`. A def's predicate reads it with `inSpan`, so a row that holds
 * its number somewhere unusual (a board row whose picks each have one) stays free to say how.
 */
export interface SpanFilter<T> extends BaseFilter<T> {
  type: 'span'
  min: number
  max: number
  /** Renders each end, e.g. `(n) => `R${n}``. Defaults to the bare number. */
  format?: (n: number) => string
}

/** Checkbox filter — on/off. Active value is '1'; the predicate decides what "on" keeps. */
export interface ToggleFilter<T> extends BaseFilter<T> {
  type: 'toggle'
}

export type FilterDef<T> = SelectFilter<T> | RangeFilter<T> | SpanFilter<T> | ToggleFilter<T>

/** `"3-7"` → `[3, 7]`. Undefined for anything that isn't a well-formed span. */
export function parseSpan(value: string): [number, number] | undefined {
  const [lo, hi] = value.split('-').map(Number)
  if (lo === undefined || hi === undefined || !Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) return undefined
  return [lo, hi]
}

/** Is `n` inside the span `value` encodes? An unparseable value keeps the row, so a hand-edited URL
 *  degrades to "no filter" rather than to an empty table. */
export function inSpan(n: number, value: string): boolean {
  const span = parseSpan(value)
  if (span === undefined) return true
  return n >= span[0] && n <= span[1]
}

/** The value a span filter should carry, or '' when it spans everything and is therefore off. */
export function spanValue(lo: number, hi: number, min: number, max: number): string {
  return lo <= min && hi >= max ? '' : `${lo}-${hi}`
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
  const [params] = useSearchParams()
  const update = useUpdateUrlParams()

  const values = useMemo(() => {
    const v: Record<string, string> = {}
    for (const def of defs) {
      const value = params.get(def.key)
      if (value) v[def.key] = value
    }
    return v
  }, [params, defs])

  const filtered = useMemo(() => applyFilters(defs, values, rows), [defs, values, rows])

  const setValue = useCallback((key: string, value: string) => update({ [key]: value || null }), [update])

  const clear = useCallback(() => update(Object.fromEntries(defs.map((def) => [def.key, null]))), [update, defs])

  return { rows: filtered, values, setValue, clear, activeCount: Object.keys(values).length }
}
