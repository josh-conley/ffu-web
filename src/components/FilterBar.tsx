import type { FilterDef } from '@/hooks/useFilters'
import { SELECT } from './controls'

/** Renders a row of dropdowns from FilterDefs (+ a Clear when any are active). Presentational —
 *  state lives in useFilters. Reused by any filtered view. */
export function FilterBar<T>({
  defs,
  values,
  onChange,
  onClear,
  activeCount,
}: {
  defs: FilterDef<T>[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onClear: () => void
  activeCount: number
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {defs.map((def) => (
        <label key={def.key} className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{def.label}</span>
          <select
            className={SELECT}
            aria-label={def.label}
            value={values[def.key] ?? ''}
            onChange={(e) => onChange(def.key, e.target.value)}
          >
            <option value="">All</option>
            {def.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 px-1 text-sm font-medium text-muted underline-offset-2 hover:text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0"
        >
          Clear
        </button>
      )}
    </div>
  )
}
