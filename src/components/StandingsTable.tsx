import { useMemo } from 'react'
import { nameForYear } from '@/config'
import type { StandingsLines } from '@/hooks/useStandingsLines'
import { baseRateFor, firstOutside, recordKey, seasonMove, type StandingRow } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { recordLabel } from './format'
import { BerthTag, CutLabel, MoveMark } from './standingsMarks'
import { baseRateSentence, PICTURE_CAPTION } from './standingsText'
import { TeamLogo } from './TeamLogo'

function TeamCell({ row, year, lines }: { row: StandingRow; year: string; lines: StandingsLines | undefined }) {
  const move = seasonMove(row.team)
  const berth = lines?.picture.berths.get(row.team.memberId)
  return (
    <span className="flex items-center gap-2">
      <TeamLogo ffuId={row.team.memberId} />
      <span className="font-semibold max-sm:max-w-36 sm:whitespace-nowrap">{nameForYear(row.team.memberId, year) ?? row.team.memberId}</span>
      {move && <MoveMark move={move} year={year} />}
      {berth && <BerthTag berth={berth} />}
    </span>
  )
}

/** The record, titled with how that record after this many weeks has turned out before. */
function RecordCell({ row, lines }: { row: StandingRow; lines: StandingsLines | undefined }) {
  const rate = baseRateFor(lines?.rates, row.team.record)
  const title = lines?.rates && rate ? baseRateSentence(lines.rates, recordKey(row.team.record), rate) : undefined
  return <span title={title}>{recordLabel(row.team.record)}</span>
}

/** `upr` is empty until the season has earned a rating (see `seasonUpr`), and the column goes with
 *  it — a column of em-dashes says less than its absence, which the page explains once. */
function buildColumns(upr: Map<string, number>, year: string, lines: StandingsLines | undefined): Column<StandingRow>[] {
  const num = (key: string, header: string, get: (r: StandingRow) => number, fmt: (n: number) => string, title?: string): Column<StandingRow> => ({
    key, header, align: 'right', title, sortValue: get, render: (r) => fmt(get(r)),
  })
  const rankTitle = lines ? 'Position if the season ended today' : 'Final placement after playoffs'
  return [
    { key: 'rank', header: '#', align: 'right', title: rankTitle, sortValue: (r) => r.rank, render: (r) => <span className="font-semibold">{r.rank}</span> },
    {
      key: 'team',
      header: 'Team',
      sortValue: (r) => nameForYear(r.team.memberId, year) ?? r.team.memberId,
      render: (r) => <TeamCell row={r} year={year} lines={lines} />,
    },
    { key: 'record', header: 'Record', sortValue: (r) => r.winPct, render: (r) => <RecordCell row={r} lines={lines} /> },
    num('pf', 'PF', (r) => r.team.points.for, (n) => n.toFixed(2), 'Points For'),
    num('pa', 'PA', (r) => r.team.points.against, (n) => n.toFixed(2), 'Points Against'),
    num('winpct', 'Win%', (r) => r.winPct, (n) => `${(n * 100).toFixed(1)}%`),
    ...(upr.size > 0
      ? [num('upr', 'UPR', (r) => upr.get(r.team.memberId) ?? 0, (n) => (n ? n.toFixed(2) : '—'), 'Union Power Ranking')]
      : []),
  ]
}

/**
 * One league's standings. With `lines` (a season being played) teams are tagged with their playoff
 * berth; `cutLine` also draws the playoff line itself — only where the rows ARE the whole league in
 * picture order, not in a single division's slice.
 */
export function StandingsTable({
  rows,
  upr,
  year,
  lines,
  cutLine = false,
}: {
  rows: StandingRow[]
  upr: Map<string, number>
  year: string
  lines?: StandingsLines
  cutLine?: boolean
}) {
  const columns = useMemo(() => buildColumns(upr, year, lines), [upr, year, lines])
  const dividers = useMemo(() => {
    const first = cutLine && lines ? firstOutside(lines.picture) : undefined
    return first === undefined || !lines ? undefined : new Map([[first, <CutLabel relegation={lines.relegation} />]])
  }, [cutLine, lines])
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.team.memberId}
      initialSort={{ key: 'rank', dir: 'asc' }}
      dividers={dividers}
      caption={lines ? PICTURE_CAPTION : undefined}
    />
  )
}
