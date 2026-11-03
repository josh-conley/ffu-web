/**
 * Labeled one-knob range slider (sharp accent thumb), sharing the control aesthetic with the
 * selects. Shared (Charter DRY): the Builds page's round and sample-size sliders and the UPR
 * Explorer's week slider are the same control. `DualRangeSlider` is the two-knob sibling.
 */
export function RangeSlider({ label, value, min, max, valueLabel, onChange }: { label: string; value: number; min: number; max: number; valueLabel: string; onChange: (v: string) => void }) {
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
