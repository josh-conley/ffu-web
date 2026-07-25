import type { ReactNode } from 'react'
import { FaChevronRight } from 'react-icons/fa6'
import type { Bracket, BuildBaselines, BuildStat } from '@/selectors'
import { orderedPositions } from '@/selectors'
import type { Column } from '@/components/DataTable'
import { posClass } from '@/components/positions'

// Column defs for the Roster Build Stats table (kept out of the page to respect the line caps). The
// build cell renders the position composition as colored pills (positions.ts is the single source
// of position color); each finish bracket shows its share (%) with the raw count beside it. Render
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

const EPSILON = 0.005

/**
 * A finish-bracket cell: share (%) tinted vs the sample baseline — green when the build beats the
 * "expected by chance" rate for that bracket, red when worse. The raw count sits muted beside it.
 */
function bracketCell(b: Bracket, baseline: number): ReactNode {
  const diff = b.pct - baseline
  const tone = b.count === 0 || Math.abs(diff) < EPSILON ? 'text-muted' : diff > 0 ? 'text-positive' : 'text-negative'
  return (
    <span className="flex items-baseline justify-end gap-1.5 tabular-nums">
      <span className={`font-bold ${tone}`}>{Math.round(b.pct * 100)}%</span>
      <span className="text-xs text-muted">{b.count}</span>
    </span>
  )
}

/** A finish-bracket column: header shows the baseline; cells are tinted against it; sorted by share. */
function bracketColumn(key: string, header: string, get: (b: BuildStat) => Bracket, baseline: number): Column<BuildStat> {
  return {
    key,
    header: `${header} · ${Math.round(baseline * 100)}%`,
    align: 'right',
    title: `Share (and count) finishing in the ${header.toLowerCase()} — baseline ${Math.round(baseline * 100)}%`,
    sortValue: (b) => get(b).pct * 1000 + get(b).count,
    render: (b) => bracketCell(get(b), baseline),
  }
}

/** A scalar metric tinted vs its baseline (green better, red worse); `higherIsBetter` sets direction. */
function metricCell(value: number | null, baseline: number, higherIsBetter: boolean, epsilon: number, fmt: (n: number) => string): ReactNode {
  if (value === null) return <span className="text-muted">—</span>
  const good = higherIsBetter ? value - baseline : baseline - value
  const tone = Math.abs(good) < epsilon ? 'text-muted' : good > 0 ? 'text-positive' : 'text-negative'
  return <span className={`font-semibold tabular-nums ${tone}`}>{fmt(value)}</span>
}

function metricColumn(key: string, header: string, title: string, get: (b: BuildStat) => number | null, baseline: number, higherIsBetter: boolean, epsilon: number, fmt: (n: number) => string): Column<BuildStat> {
  // Nulls sort to the bottom regardless of direction.
  const sortMiss = higherIsBetter ? -Infinity : Infinity
  return {
    key,
    header,
    align: 'right',
    title,
    sortValue: (b) => get(b) ?? sortMiss,
    render: (b) => metricCell(get(b), baseline, higherIsBetter, epsilon, fmt),
  }
}

const f1 = (n: number) => n.toFixed(1)

export function buildColumns(baselines: BuildBaselines, openKey?: string): Column<BuildStat>[] {
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
    metricColumn('avgFinish', 'Avg', `Average final placement — baseline ${baselines.finish.toFixed(1)} (lower is better)`, (b) => b.avgFinish, baselines.finish, false, 0.05, f1),
    metricColumn('medianFinish', 'Med', 'Median final placement (lower is better)', (b) => b.medianFinish, baselines.finish, false, 0.05, f1),
    metricColumn('avgUpr', 'UPR', `Average Unified Power Rating — baseline ${baselines.upr.toFixed(1)} (higher is better)`, (b) => b.avgUpr, baselines.upr, true, 0.5, f1),
    bracketColumn('first', '1st', (b) => b.first, baselines.first),
    bracketColumn('top3', 'Top 3', (b) => b.top3, baselines.top3),
    bracketColumn('top6', 'Top 6', (b) => b.top6, baselines.top6),
    bracketColumn('top9', 'Top 9', (b) => b.top9, baselines.top9),
    {
      key: 'open',
      header: '',
      align: 'center',
      title: 'Click a row to view the teams',
      render: (b) => (
        <span className="flex items-center justify-center gap-1 whitespace-nowrap text-muted group-hover:text-accent">
          <span className="hidden text-[11px] font-semibold uppercase tracking-wide lg:inline">Teams</span>
          <FaChevronRight size={11} className={`transition-transform ${b.key === openKey ? 'rotate-90 text-accent' : ''}`} />
        </span>
      ),
    },
  ]
}
