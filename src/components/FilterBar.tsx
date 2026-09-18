import { parseSpan, spanValue, type FilterDef } from '@/hooks/useFilters'
import { SELECT, segButton } from './controls'
import { DualRangeSlider } from './DualRangeSlider'

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

/** Segmented-button control for a toggle filter (on = solid FFU red), matching the site's toggles. */
function ToggleControl<T>({ def, value, onChange }: { def: Extract<FilterDef<T>, { type: 'toggle' }>; value: string; onChange: (v: string) => void }) {
  const on = value === '1'
  return (
    <button type="button" onClick={() => onChange(on ? '' : '1')} aria-pressed={on} className={segButton(on)}>
      {def.label}
    </button>
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

/**
 * Two-knob control for a span filter — "Rounds 3 – 7". An empty value means the whole range, so a
 * fresh page shows both knobs at the ends and the filter counts as inactive; dragging back to the
 * ends clears it again rather than leaving a no-op filter in the URL and on the Clear count.
 */
function SpanControl<T>({ def, value, onChange }: { def: Extract<FilterDef<T>, { type: 'span' }>; value: string; onChange: (v: string) => void }) {
  const [from, to] = parseSpan(value) ?? [def.min, def.max]
  const set = (lo: number, hi: number) => onChange(spanValue(lo, hi, def.min, def.max))
  return (
    <DualRangeSlider
      label={def.label}
      min={def.min}
      max={def.max}
      from={Math.max(from, def.min)}
      to={Math.min(to, def.max)}
      onFrom={(n) => set(n, to)}
      onTo={(n) => set(from, n)}
      format={def.format ?? String}
    />
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
  showClear = true,
}: {
  defs: FilterDef<T>[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onClear: () => void
  activeCount: number
  /** Show the inline "Clear" when filters are active. Off when the page has its own reset control. */
  showClear?: boolean
}) {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      {defs.map((def) =>
        def.type === 'toggle' ? (
          <ToggleControl key={def.key} def={def} value={values[def.key] ?? ''} onChange={(v) => onChange(def.key, v)} />
        ) : def.type === 'span' ? (
          // Outside the <label> wrapper the others use: a span filter is two inputs, and one label
          // cannot point at both.
          <SpanControl key={def.key} def={def} value={values[def.key] ?? ''} onChange={(v) => onChange(def.key, v)} />
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
      {showClear && activeCount > 0 && (
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
