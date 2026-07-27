import type { ReactNode } from 'react'
import { FILTER_POSITIONS } from '@/selectors'
import { SELECT, segButton } from '@/components/controls'
import { LEAGUE_STYLES } from '@/components/leagues'
import { posClass } from '@/components/positions'

// All of the Roster Build Stats control UI, split out of the page to keep it under the file/complexity
// caps. Row 1 = scope (which seasons/teams enter the sample), Row 2 = build definition (how a
// team's picks become a build). URL-backed selection state lives in ./rosterBuildFilters.

const LEAGUE_OPTIONS = [
  { value: 'ALL', label: 'All Leagues' },
  ...(['PREMIER', 'MASTERS', 'NATIONAL'] as const).map((t) => ({ value: t, label: LEAGUE_STYLES[t].label })),
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  )
}

/** Labeled range slider (sharp accent thumb) — shares the control aesthetic with the selects. */
function RangeSlider({ label, value, min, max, valueLabel, onChange }: { label: string; value: number; min: number; max: number; valueLabel: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex h-11 items-center gap-3 md:h-auto">
        <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="w-32 accent-accent sm:w-40" />
        <span className="w-14 shrink-0 text-sm font-bold tabular-nums">{valueLabel}</span>
      </div>
    </div>
  )
}

/**
 * Two-knob range slider: two range inputs overlaid on one track (fill between the thumbs). Inputs
 * are pointer-transparent except their thumbs (see `.range-dual` in index.css), so both knobs stay
 * draggable. The thumbs clamp against each other so `from` can never pass `to`.
 */
function DualRangeSlider({ label, min, max, from, to, onFrom, onTo, format }: { label: string; min: number; max: number; from: number; to: number; onFrom: (n: number) => void; onTo: (n: number) => void; format: (n: number) => string }) {
  const span = Math.max(1, max - min)
  const pct = (n: number) => ((n - min) / span) * 100
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex h-11 items-center gap-3 md:h-auto">
        <div className="relative h-4 w-36 sm:w-44">
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 bg-surface-2" />
          <div className="absolute top-1/2 h-1 -translate-y-1/2 bg-accent" style={{ left: `${pct(from)}%`, right: `${100 - pct(to)}%` }} />
          <input type="range" min={min} max={max} value={from} aria-label={`${label} from`} onChange={(e) => onFrom(Math.min(Number(e.target.value), to))} className="range-dual absolute inset-0 h-full w-full" />
          <input type="range" min={min} max={max} value={to} aria-label={`${label} to`} onChange={(e) => onTo(Math.max(Number(e.target.value), from))} className="range-dual absolute inset-0 h-full w-full" />
        </div>
        <span className="w-24 shrink-0 text-sm font-bold tabular-nums">{format(from)} – {format(to)}</span>
      </div>
    </div>
  )
}

/** A small "All" link that resets a checkbox group to everything selected (disabled when already so). */
function AllButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="text-[11px] font-semibold uppercase tracking-wide text-accent hover:underline disabled:text-muted disabled:no-underline">
      All
    </button>
  )
}

/** Position filter — a build only counts the checked positions, so unchecking merges buckets. */
function PositionCheckboxes({ selected, onToggle, onAll }: { selected: string[]; onToggle: (p: string) => void; onAll: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Positions counted</span>
        <AllButton onClick={onAll} disabled={selected.length === FILTER_POSITIONS.length} />
      </span>
      <div className="flex flex-wrap gap-1">
        {FILTER_POSITIONS.map((p) => {
          const on = selected.includes(p)
          return (
            <button key={p} type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(p)} className={`inline-flex min-h-11 items-center gap-1.5 border px-3 py-1.5 text-sm font-bold uppercase tracking-wide md:min-h-0 ${on ? `${posClass(p)} border-transparent` : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-text'}`}>
              <span aria-hidden className="text-xs">{on ? '☑' : '☐'}</span>
              {p}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Draft-slot filter — keep only teams that picked from the checked draft-order positions. */
function SlotCheckboxes({ allSlots, selected, onToggle, onAll }: { allSlots: number[]; selected: Set<number>; onToggle: (n: number) => void; onAll: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Draft slot</span>
        <AllButton onClick={onAll} disabled={selected.size === allSlots.length} />
      </span>
      <div className="flex flex-wrap gap-1">
        {allSlots.map((n) => {
          const on = selected.has(n)
          return (
            <button key={n} type="button" role="checkbox" aria-checked={on} aria-label={`Draft slot ${n}`} onClick={() => onToggle(n)} className={`inline-flex h-9 w-9 items-center justify-center border text-sm font-bold tabular-nums ${on ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-text'}`}>
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Year range — a two-knob slider restricting the sample to a span of seasons (the meta shifts). */
function YearRange({ years, fromYear, toYear, onFrom, onTo }: { years: string[]; fromYear: string; toYear: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <DualRangeSlider
      label="Years"
      min={Number(years[0] ?? 0)}
      max={Number(years.at(-1) ?? 0)}
      from={Number(fromYear)}
      to={Number(toYear)}
      onFrom={(n) => onFrom(String(n))}
      onTo={(n) => onTo(String(n))}
      format={String}
    />
  )
}

export interface ControlsProps {
  league: string
  onLeague: (v: string) => void
  years: string[]
  fromYear: string
  toYear: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
  threshold: number
  onThreshold: (v: string) => void
  minParam: string
  onMin: (v: string) => void
  selected: string[]
  onTogglePos: (p: string) => void
  onAllPos: () => void
  allSlots: number[]
  selectedSlots: Set<number>
  onToggleSlot: (n: number) => void
  onAllSlots: () => void
  onReset: () => void
}

export function Controls(props: ControlsProps) {
  const { league, onLeague, years, fromYear, toYear, onFrom, onTo, threshold, onThreshold, minParam, onMin, selected, onTogglePos, onAllPos, allSlots, selectedSlots, onToggleSlot, onAllSlots, onReset } = props
  const row = 'flex flex-wrap items-end gap-x-4 gap-y-3'
  return (
    <div className="space-y-3 border border-border bg-surface p-3">
      {/* Row 1 — scope: which seasons/teams enter the sample. */}
      <div className={row}>
        <Field label="League">
          <select className={`${SELECT} w-full sm:w-40`} value={league} onChange={(e) => onLeague(e.target.value)} aria-label="League">
            {LEAGUE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <YearRange years={years} fromYear={fromYear} toYear={toYear} onFrom={onFrom} onTo={onTo} />
        <button type="button" onClick={onReset} className={`${segButton(false)} ml-auto self-end`}>Reset</button>
      </div>
      {/* Row 2 — sizing sliders: how deep a build reads, and the min-sample cutoff. */}
      <div className={`${row} border-t border-border pt-3`}>
        <RangeSlider label="First N rounds" value={threshold} min={1} max={12} valueLabel={`${threshold} ${threshold === 1 ? 'rd' : 'rds'}`} onChange={onThreshold} />
        <RangeSlider label="Min teams" value={Number(minParam)} min={1} max={20} valueLabel={`≥ ${minParam}`} onChange={onMin} />
      </div>
      {/* Row 3 — build filters: which positions count, and which draft slots qualify. */}
      <div className={row}>
        <PositionCheckboxes selected={selected} onToggle={onTogglePos} onAll={onAllPos} />
        <SlotCheckboxes allSlots={allSlots} selected={selectedSlots} onToggle={onToggleSlot} onAll={onAllSlots} />
      </div>
    </div>
  )
}
