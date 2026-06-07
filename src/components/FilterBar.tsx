import type { FilterDef } from '@/hooks/useFilters'
import { SELECT } from './controls'

/** Dropdown control for a select filter. */
function SelectControl<T>({ def, value, onChange }: { def: Extract<FilterDef<T>, { options: unknown }>; value: string; onChange: (v: string) => void }) {
  return (
    <select className={SELECT} aria-label={def.label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All</option>
      {def.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Checkbox control for a toggle filter (label inline). On = value '1'. */
function ToggleControl<T>({ def, value, onChange }: { def: Extract<FilterDef<T>, { type: 'toggle' }>; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-11 cursor-pointer items-center gap-2 text-sm font-semibold md:h-auto">
      <input
        type="checkbox"
        checked={value === '1'}
        onChange={(e) => onChange(e.target.checked ? '1' : '')}
        className="size-4 accent-accent"
      />
      {def.label}
    </label>
  )
}

/** Slider control for a range filter — shows the current "≥ N" value, or "Any" at the minimum. */
function RangeControl<T>({ def, value, onChange }: { def: Extract<FilterDef<T>, { type: 'range' }>; value: string; onChange: (v: string) => void }) {
  const current = value ? Number(value) : def.min
  return (
    <div className="flex h-11 items-center gap-2 md:h-auto">
      <input
        type="range"
        aria-label={def.label}
        min={def.min}
        max={def.max}
        step={def.step ?? 1}
        value={current}
        // At the minimum the filter is "off" (clear it) so it doesn't count as active.
        onChange={(e) => onChange(e.target.value === String(def.min) ? '' : e.target.value)}
        className="w-32 accent-accent"
      />
      <span className="w-10 text-sm font-semibold tabular-nums">{current > def.min ? `≥ ${current}` : 'Any'}</span>
    </div>
  )
}

/** Renders a row of controls from FilterDefs (selects + range sliders) + a Clear when any are
 *  active. Presentational — state lives in useFilters. Reused by any filtered view. */
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
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      {defs.map((def) =>
        def.type === 'toggle' ? (
          <ToggleControl key={def.key} def={def} value={values[def.key] ?? ''} onChange={(v) => onChange(def.key, v)} />
        ) : (
          <label key={def.key} className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">{def.label}</span>
            {def.type === 'range' ? (
              <RangeControl def={def} value={values[def.key] ?? ''} onChange={(v) => onChange(def.key, v)} />
            ) : (
              <SelectControl def={def} value={values[def.key] ?? ''} onChange={(v) => onChange(def.key, v)} />
            )}
          </label>
        ),
      )}
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
