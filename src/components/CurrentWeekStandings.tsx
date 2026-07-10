import { useMemo } from 'react'
import { nameForYear } from '@/config'
import type { LiveStandingRow } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { TeamLogo } from './TeamLogo'

function recordLabel(row: LiveStandingRow): string {
  const { wins, losses, ties } = row.totals
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`
}

function buildColumns(year: string): Column<LiveStandingRow>[] {
  return [
    { key: 'rank', header: 'Rank', sortValue: (r) => r.rank, render: (r) => <span className="font-semibold">{r.rank}</span> },
    {
      key: 'team',
      header: 'Team',
      sortValue: (r) => nameForYear(r.totals.memberId, year) ?? r.totals.memberId,
      render: (r) => (
        <span className="flex items-center gap-2">
          <TeamLogo ffuId={r.totals.memberId} />
          <span className="font-semibold whitespace-nowrap">{nameForYear(r.totals.memberId, year) ?? r.totals.memberId}</span>
        </span>
      ),
    },
    { key: 'record', header: 'Record', sortValue: (r) => r.totals.winPct, render: (r) => recordLabel(r) },
    {
      key: 'pf',
      header: 'PF',
      align: 'right',
      title: 'Points For',
      sortValue: (r) => r.totals.pointsFor,
      render: (r) => r.totals.pointsFor.toFixed(2),
    },
  ]
}

/** Compact standings-through-last-completed-week table for the home page's This Week section. */
export function CurrentWeekStandings({ rows, year }: { rows: LiveStandingRow[]; year: string }) {
  const columns = useMemo(() => buildColumns(year), [year])
  return <DataTable columns={columns} rows={rows} getRowKey={(r) => r.totals.memberId} initialSort={{ key: 'rank', dir: 'asc' }} />
}
