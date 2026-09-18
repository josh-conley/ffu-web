/**
 * Two-knob range slider: two range inputs overlaid on one track, with the span between the thumbs
 * filled. The inputs are pointer-transparent except their thumbs (see `.range-dual` in index.css),
 * so both knobs stay independently draggable, and each is a real `<input type="range">` so both
 * ends are keyboard-operable and announced.
 *
 * The thumbs clamp against each other, so `from` can never pass `to`.
 *
 * Shared (Charter DRY): the Builds page's year range and the ADP page's round filter are the same
 * control and must behave identically.
 */
export function DualRangeSlider({
  label,
  min,
  max,
  from,
  to,
  onFrom,
  onTo,
  format,
}: {
  label: string
  min: number
  max: number
  from: number
  to: number
  onFrom: (n: number) => void
  onTo: (n: number) => void
  format: (n: number) => string
}) {
  const span = Math.max(1, max - min)
  const pct = (n: number) => ((n - min) / span) * 100
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {/* 34px at md is exactly a SELECT's height there (py-1.5 + text-sm + border), so a slider
          sitting in a row of selects lines its label up with theirs instead of dropping below. */}
      <div className="flex h-11 items-center gap-3 md:h-[34px]">
        <div className="relative h-4 w-36 sm:w-44">
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 bg-surface-2" />
          <div className="absolute top-1/2 h-1 -translate-y-1/2 bg-accent" style={{ left: `${pct(from)}%`, right: `${100 - pct(to)}%` }} />
          <input type="range" min={min} max={max} value={from} aria-label={`${label} from`} onChange={(e) => onFrom(Math.min(Number(e.target.value), to))} className="range-dual absolute inset-0 h-full w-full" />
          <input type="range" min={min} max={max} value={to} aria-label={`${label} to`} onChange={(e) => onTo(Math.max(Number(e.target.value), from))} className="range-dual absolute inset-0 h-full w-full" />
        </div>
        <span className="w-24 shrink-0 text-sm font-bold tabular-nums">
          {format(from)} – {format(to)}
        </span>
      </div>
    </div>
  )
}
