import type { ReactNode } from 'react'
import { FaChevronRight, FaTrophy } from 'react-icons/fa6'
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

/** Finals started, with the ones his team won beside a trophy — "2 · 🏆1". */
function TitleGames({ row }: { row: PlayerSummary }) {
  if (row.titleGames === 0) return <span className="font-mono text-muted">0</span>
  return (
    <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
      {row.titleGames}
      {row.titlesWon > 0 && (
        <span className="inline-flex items-center gap-0.5 text-amber-500" title={`Won ${row.titlesWon}`}>
          <FaTrophy size={10} aria-hidden />
          {row.titlesWon}
        </span>
      )}
    </span>
  )
}

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
    {
      key: 'titleGames',
      header: 'Title Gms',
      title: 'Championship finals he started in (trophy: finals his team won)',
      align: 'right',
      render: (r) => <TitleGames row={r} />,
      sortValue: (r) => r.titleGames * 100 + r.titlesWon,
    },
    num('starts', 'Starts', 'Weeks in an FFU starting lineup'),
    num('avg', 'Avg', 'Points per start', pts),
    num('best', 'Best', 'His best started week', pts),
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
