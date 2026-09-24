import type { PlayerSummary } from '@/selectors'
import { DataTable, type Column } from '../DataTable'
import { PlayerLink } from './PlayerLink'

const num = (key: keyof PlayerSummary & string, header: string, title: string, fmt = (n: number) => String(n)): Column<PlayerSummary> => ({
  key,
  header,
  title,
  align: 'right',
  render: (r) => <span className="font-mono tabular-nums">{fmt(r[key] as number)}</span>,
  sortValue: (r) => r[key] as number,
})

const pts = (n: number) => n.toFixed(2)

const COLUMNS: Column<PlayerSummary>[] = [
  {
    key: 'player',
    header: 'Player',
    render: (r) => <PlayerLink playerId={r.playerId} name={r.name} position={r.position} />,
    sortValue: (r) => r.name,
  },
  num('points', 'FFU Pts', 'Points scored while in an FFU starting lineup', pts),
  num('starts', 'Starts', 'Weeks in an FFU starting lineup'),
  num('avg', 'Avg', 'Points per start', pts),
  num('best', 'Best', 'His best started week', pts),
  num('managers', 'Teams', 'Different FFU teams that started him'),
  num('seasons', 'Seasons', 'Seasons on an FFU roster'),
]

/** Every player FFU has rostered, most FFU points first. */
export function PlayerIndexTable({ rows }: { rows: PlayerSummary[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      getRowKey={(r) => r.playerId}
      initialSort={{ key: 'points', dir: 'desc' }}
      pageSize={50}
      stickyFirstColumn
    />
  )
}
