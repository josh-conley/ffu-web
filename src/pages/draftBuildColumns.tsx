import type { ReactNode } from 'react'
import type { BuildStat } from '@/selectors'
import { orderedPositions } from '@/selectors'
import type { Column } from '@/components/DataTable'
import { posClass } from '@/components/positions'

// Column defs for the Draft Analysis table (kept out of the page to respect the line caps). The
// build cell renders the position composition as colored pills (positions.ts is the single source
// of position color); the rate cell draws a proportion bar with the sample baseline marked. Render
// helpers are lowercase (repo convention, see allTimeColumns) so the file only exports the builder.

/** The build's position composition as colored count-pills, e.g. [2 RB] [1 WR]. The "none of the
 *  selected positions" bucket has no counts, so it falls back to its label ("0 RB · 0 WR"). */
function buildBadges(counts: Record<string, number>, label: string): ReactNode {
  const positions = orderedPositions(counts)
  if (positions.length === 0) return <span className="text-sm font-medium text-muted">{label}</span>
  return (
    <span className="flex flex-wrap items-center gap-1">
      {positions.map((p) => (
        <span key={p} className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold ${posClass(p)}`}>
          <span className="tabular-nums">{counts[p]}</span>
          {p}
        </span>
      ))}
    </span>
  )
}

/** Playoff rate as a green/red bar (filled to the rate) with a tick at the sample baseline. */
function rateBar(pct: number, baseline: number): ReactNode {
  const above = pct >= baseline
  return (
    <span className="flex items-center justify-end gap-2">
      <span className={`w-9 text-right font-bold tabular-nums ${above ? 'text-positive' : 'text-negative'}`}>{Math.round(pct * 100)}%</span>
      <span className="relative hidden h-2.5 w-24 bg-surface-2 sm:block" aria-hidden>
        <span className={`absolute inset-y-0 left-0 ${above ? 'bg-positive/70' : 'bg-negative/70'}`} style={{ width: `${pct * 100}%` }} />
        <span className="absolute inset-y-0 w-px bg-text/40" style={{ left: `${baseline * 100}%` }} title="Baseline" />
      </span>
    </span>
  )
}

/** Signed percentage-point edge vs the baseline (green above, red below). */
function edgeCell(edge: number): ReactNode {
  const tone = edge > 0.5 ? 'text-positive' : edge < -0.5 ? 'text-negative' : 'text-muted'
  return (
    <span className={`font-semibold tabular-nums ${tone}`}>
      {edge >= 0 ? '+' : ''}
      {edge.toFixed(0)}
    </span>
  )
}

export function buildColumns(baselinePct: number): Column<BuildStat>[] {
  return [
    { key: 'build', header: 'Build', render: (b) => buildBadges(b.counts, b.label) },
    {
      key: 'teams',
      header: 'Teams',
      align: 'right',
      title: 'Team-seasons that drafted this build',
      sortValue: (b) => b.teams,
      render: (b) => <span className="tabular-nums">{b.teams}</span>,
    },
    {
      key: 'playoffTeams',
      header: 'Playoffs',
      align: 'right',
      title: 'How many of those reached the championship bracket',
      sortValue: (b) => b.playoffTeams,
      render: (b) => <span className="tabular-nums">{b.playoffTeams}</span>,
    },
    {
      key: 'playoffPct',
      header: 'Playoff Rate',
      align: 'right',
      sortValue: (b) => b.playoffPct,
      render: (b) => rateBar(b.playoffPct, baselinePct),
    },
    {
      key: 'edge',
      header: 'Edge',
      align: 'right',
      title: 'Percentage points above/below the sample baseline',
      sortValue: (b) => b.edge,
      render: (b) => edgeCell(b.edge),
    },
  ]
}
