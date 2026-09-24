import type { PlayerSummary } from '@/selectors'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-t-[3px] border-t-accent bg-surface-2 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold tabular-nums text-text">{value}</div>
    </div>
  )
}

/** A player's headline FFU numbers. */
export function PlayerStats({ summary, titles }: { summary: PlayerSummary; titles: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label="FFU Points" value={summary.points.toFixed(2)} />
      <Stat label="Starts" value={summary.starts} />
      <Stat label="Per Start" value={summary.avg.toFixed(2)} />
      <Stat label="Best Week" value={summary.best.toFixed(2)} />
      <Stat label="Teams Started Him" value={summary.managers} />
      <Stat label="Titles" value={titles} />
    </div>
  )
}
