import { useMemo } from 'react'
import { getMember } from '@/config'
import type { MilestoneCategory, MilestoneStanding } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { TeamLogo } from './TeamLogo'

// How each category's numbers read. Kept beside the table rather than in the selector: the
// thresholds are facts, but "$1,500" vs "1,500.00" is a display choice.
const FORMAT: Record<MilestoneCategory, (n: number) => string> = {
  pointsFor: (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  pointsAgainst: (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  wins: (n) => String(Math.round(n)),
  earnings: (n) => `$${Math.round(n).toLocaleString('en-US')}`,
}

const teamName = (memberId: string) => getMember(memberId)?.name ?? memberId

/** A bar for how far through the current band a member is. Decorative — the numbers carry it. */
function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100)
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 shrink-0 bg-surface-2" aria-hidden>
        <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-xs tabular-nums text-muted">{pct}%</span>
    </span>
  )
}

function columnsFor(category: MilestoneCategory): Column<MilestoneStanding>[] {
  const fmt = FORMAT[category]
  return [
    {
      key: 'team',
      header: 'Team',
      sortValue: (r) => teamName(r.memberId),
      render: (r) => (
        <span className="flex items-center gap-2">
          <TeamLogo ffuId={r.memberId} />
          <span className="font-semibold whitespace-nowrap">{teamName(r.memberId)}</span>
        </span>
      ),
    },
    { key: 'value', header: 'Current', align: 'right', sortValue: (r) => r.value, render: (r) => fmt(r.value) },
    { key: 'next', header: 'Next', align: 'right', sortValue: (r) => r.next ?? 0, render: (r) => (r.next === null ? '—' : fmt(r.next)) },
    {
      key: 'remaining',
      header: 'To go',
      align: 'right',
      sortValue: (r) => r.remaining ?? 0,
      render: (r) => <span className="font-semibold">{r.remaining === null ? '—' : fmt(r.remaining)}</span>,
    },
    {
      key: 'progress',
      header: 'Progress',
      sortValue: (r) => r.progress ?? 0,
      render: (r) => (r.progress === null ? '—' : <ProgressBar progress={r.progress} />),
    },
  ]
}

export function MilestoneTable({ category, rows }: { category: MilestoneCategory; rows: MilestoneStanding[] }) {
  const columns = useMemo(() => columnsFor(category), [category])
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.memberId}
      initialSort={{ key: 'remaining', dir: 'asc' }}
    />
  )
}

/** Milestones already banked, newest first — the counterpart to the watch list. */
export function RecentlyReached({ rows, category }: { rows: MilestoneStanding[]; category: MilestoneCategory }) {
  const fmt = FORMAT[category]
  const reached = rows
    .flatMap((r) => r.achieved.map((a) => ({ ...a, memberId: r.memberId })))
    .sort((a, b) => Number(b.year) - Number(a.year) || b.milestone - a.milestone)
    .slice(0, 6)

  if (reached.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {reached.map((a) => (
        <li
          key={`${a.memberId}-${a.milestone}`}
          className="flex items-center gap-2 border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm"
        >
          <TeamLogo ffuId={a.memberId} size={18} />
          <span className="font-semibold">{teamName(a.memberId)}</span>
          <span className="text-muted">
            {fmt(a.milestone)} in {a.year}
          </span>
        </li>
      ))}
    </ul>
  )
}
