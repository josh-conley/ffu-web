import { Link } from 'react-router-dom'
import type { PlayerSummary } from '@/selectors'
import { useFranchisePlayers } from '@/hooks/useFranchisePlayers'
import { useInView } from '@/hooks/useInView'
import { DataTable, type Column } from '../DataTable'
import { LoadingSpinner } from '../LoadingSpinner'
import { ErrorMessage } from '../ErrorMessage'
import { EmptyNote, MemberSection } from './MemberSection'

const COLUMNS: Column<PlayerSummary>[] = [
  {
    key: 'player',
    header: 'Player',
    render: (r) => (
      <Link to={`/players?q=${encodeURIComponent(r.name)}`} className="font-semibold whitespace-nowrap text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {r.name}
      </Link>
    ),
  },
  { key: 'pos', header: 'Pos', render: (r) => r.position },
  { key: 'starts', header: 'Starts', align: 'right', render: (r) => r.starts },
  { key: 'points', header: 'Points', align: 'right', render: (r) => r.points.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  { key: 'seasons', header: 'Seasons', align: 'right', render: (r) => r.seasons },
]

/** The table itself — mounted only once the section is near the viewport, because it loads every lineup file. */
function FranchiseTable({ memberId }: { memberId: string }) {
  const { rows, loading, error } = useFranchisePlayers(memberId)
  if (error) return <ErrorMessage error={error} />
  if (loading || !rows) return <LoadingSpinner />
  if (rows.length === 0) return <EmptyNote>No starting lineups on file — lineups are kept from 2021 on.</EmptyNote>
  return <DataTable columns={COLUMNS} rows={rows} getRowKey={(r) => r.playerId} stickyFirstColumn />
}

/** Franchise players: the five who scored the most points in this member's starting lineups. */
export function FranchisePlayers({ memberId }: { memberId: string }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref}>
      <MemberSection title="Franchise Players" note="Most points scored in this team's starting lineups, 2021 on.">
        {inView ? <FranchiseTable memberId={memberId} /> : <div className="h-40" aria-hidden />}
      </MemberSection>
    </div>
  )
}
