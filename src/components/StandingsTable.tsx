import { useMemo } from 'react'
import { nameForYear } from '@/config'
import type { StandingRow } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { recordLabel } from './format'
import { TeamLogo } from './TeamLogo'

/** `upr` is empty until the season has earned a rating (see `seasonUpr`), and the column goes with
 *  it — a column of em-dashes says less than its absence, which the page explains once. */
function buildColumns(upr: Map<string, number>, year: string): Column<StandingRow>[] {
  const num = (key: string, header: string, get: (r: StandingRow) => number, fmt: (n: number) => string, title?: string): Column<StandingRow> => ({
    key, header, align: 'right', title, sortValue: get, render: (r) => fmt(get(r)),
  })
  return [
    { key: 'rank', header: 'Rank', title: 'Final placement after playoffs', sortValue: (r) => r.rank, render: (r) => <span className="font-semibold">{r.rank}</span> },
    {
      key: 'team',
      header: 'Team',
      sortValue: (r) => nameForYear(r.team.memberId, year) ?? r.team.memberId,
      render: (r) => (
        <span className="flex items-center gap-2">
          <TeamLogo ffuId={r.team.memberId} />
          <span className="font-semibold whitespace-nowrap">{nameForYear(r.team.memberId, year) ?? r.team.memberId}</span>
        </span>
      ),
    },
    { key: 'record', header: 'Record', sortValue: (r) => r.winPct, render: (r) => recordLabel(r.team.record) },
    num('pf', 'PF', (r) => r.team.points.for, (n) => n.toFixed(2), 'Points For'),
    num('pa', 'PA', (r) => r.team.points.against, (n) => n.toFixed(2), 'Points Against'),
    num('winpct', 'Win%', (r) => r.winPct, (n) => `${(n * 100).toFixed(1)}%`),
    ...(upr.size > 0
      ? [num('upr', 'UPR', (r) => upr.get(r.team.memberId) ?? 0, (n) => (n ? n.toFixed(2) : '—'), 'Union Power Ranking')]
      : []),
  ]
}

export function StandingsTable({ rows, upr, year }: { rows: StandingRow[]; upr: Map<string, number>; year: string }) {
  const columns = useMemo(() => buildColumns(upr, year), [upr, year])
  return <DataTable columns={columns} rows={rows} getRowKey={(r) => r.team.memberId} initialSort={{ key: 'rank', dir: 'asc' }} />
}
