import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMember } from '@/config'
import type { SeasonData } from '@/data'
import { meetingOrder, rivals, type H2HMeeting, type Rival } from '@/selectors'
import { DataTable, type Column } from '../DataTable'
import { TeamLogo } from '../TeamLogo'
import { recordLabel } from '../format'
import { EmptyNote, MemberSection } from './MemberSection'

const teamName = (ffuId: string) => getMember(ffuId)?.name ?? ffuId

/** "2025 Wk 7 · L 88.00–99.00", naming the round for a playoff game. */
function MeetingCell({ m }: { m: H2HMeeting }) {
  const when = m.isPlayoff ? `${m.year} ${m.round ?? 'Playoffs'}` : `${m.year} Wk ${m.week}`
  return (
    <span className="whitespace-nowrap">
      {when}
      <span className="text-muted"> · {m.result} {m.score.toFixed(2)}–{m.opponentScore.toFixed(2)}</span>
    </span>
  )
}

// Deliberately no win% column: most pairs have met a handful of times, too few for a percentage to
// mean anything, so the table shows the record and leaves the reading to the reader.
function columnsFor(memberId: string): Column<Rival>[] {
  return [
    {
      key: 'team',
      header: 'Opponent',
      sortValue: (r) => teamName(r.opponentId),
      render: (r) => (
        <span className="flex items-center gap-2">
          <TeamLogo ffuId={r.opponentId} />
          <span className="font-semibold whitespace-nowrap">{teamName(r.opponentId)}</span>
        </span>
      ),
    },
    { key: 'games', header: 'GP', title: 'Games played (regular season + playoffs)', align: 'right', sortValue: (r) => r.games, render: (r) => r.games },
    { key: 'record', header: 'W-L', align: 'right', sortValue: (r) => r.record.wins - r.record.losses, render: (r) => recordLabel(r.record) },
    { key: 'pf', header: 'PF', title: 'Points For', align: 'right', sortValue: (r) => r.record.pointsFor, render: (r) => r.record.pointsFor.toFixed(2) },
    { key: 'pa', header: 'PA', title: 'Points Against', align: 'right', sortValue: (r) => r.record.pointsAgainst, render: (r) => r.record.pointsAgainst.toFixed(2) },
    { key: 'last', header: 'Last Met', sortValue: (r) => meetingOrder(r.lastMet), render: (r) => <MeetingCell m={r.lastMet} /> },
    {
      key: 'compare',
      header: '',
      render: (r) => (
        <Link
          to={`/members?member=${memberId}&vs=${r.opponentId}`}
          aria-label={`Compare with ${teamName(r.opponentId)}`}
          className="font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Compare
        </Link>
      ),
    },
  ]
}

/** Rivals: this member's record against everyone they have played, most-played first. */
export function RivalsTable({ memberId, seasons }: { memberId: string; seasons: SeasonData[] }) {
  const rows = useMemo(() => rivals(seasons, memberId), [seasons, memberId])
  const columns = useMemo(() => columnsFor(memberId), [memberId])
  return (
    <MemberSection title="Rivals" note="Every opponent on file, regular season and playoffs.">
      {rows.length > 0 ? (
        <DataTable columns={columns} rows={rows} getRowKey={(r) => r.opponentId} initialSort={{ key: 'games', dir: 'desc' }} stickyFirstColumn />
      ) : (
        <EmptyNote>No games on file yet.</EmptyNote>
      )}
    </MemberSection>
  )
}
