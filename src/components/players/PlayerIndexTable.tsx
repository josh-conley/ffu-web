import type { ReactNode } from 'react'
import { FaChevronRight } from 'react-icons/fa6'
import type { PlayerSummary } from '@/selectors'
import { DataTable, type Column } from '../DataTable'
import { posClass } from '../positions'

const num = (key: keyof PlayerSummary & string, header: string, title: string, fmt = (n: number) => String(n)): Column<PlayerSummary> => ({
  key,
  header,
  title,
  align: 'right',
  render: (r) => <span className="font-mono tabular-nums">{fmt(r[key] as number)}</span>,
  sortValue: (r) => r[key] as number,
})

const pts = (n: number) => n.toFixed(2)

function columns(openKey: string | undefined): Column<PlayerSummary>[] {
  return [
    {
      key: 'player',
      header: 'Player',
      render: (r) => (
        <span className="flex items-center gap-2 whitespace-nowrap font-medium">
          <FaChevronRight size={11} aria-hidden className={`shrink-0 transition-transform ${r.playerId === openKey ? 'rotate-90 text-accent' : 'text-muted'}`} />
          <span className={`w-9 shrink-0 rounded px-1 text-center text-[10px] font-bold ${posClass(r.position)}`}>{r.position}</span>
          {r.name}
        </span>
      ),
      sortValue: (r) => r.name,
    },
    num('points', 'FFU Pts', 'Points scored while in an FFU starting lineup', pts),
    num('playoffApps', 'Playoffs', 'Playoff runs he started in: team-seasons where he started a championship-bracket game'),
    num('titleGames', 'Title Gms', 'Championship finals he started in, won or lost'),
    num('titlesWon', 'Titles', 'Championship finals he started in and his team won'),
    num('managers', 'Teams', 'Different FFU teams that started him'),
    num('seasons', 'Seasons', 'Seasons on an FFU roster'),
  ]
}

/** Every player FFU has rostered, most FFU points first. Click a row to open his FFU history. */
export function PlayerIndexTable({
  rows,
  openKey,
  onToggle,
  renderExpanded,
}: {
  rows: PlayerSummary[]
  openKey: string | undefined
  onToggle: (row: PlayerSummary) => void
  renderExpanded: (row: PlayerSummary) => ReactNode
}) {
  return (
    <DataTable
      columns={columns(openKey)}
      rows={rows}
      getRowKey={(r) => r.playerId}
      initialSort={{ key: 'points', dir: 'desc' }}
      pageSize={50}
      stickyFirstColumn
      onRowClick={onToggle}
      selectedRowKey={openKey}
      expandedRowKey={openKey}
      renderExpanded={renderExpanded}
    />
  )
}
