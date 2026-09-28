import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { SeasonData, Tournament } from '@/data'
import { isOnWatch, memberMilestones, milestoneStandings, type MilestoneStanding } from '@/selectors'
import { DataTable, type Column } from '../DataTable'
import { MILESTONE_FORMAT as FORMAT, MILESTONE_META as META } from '../milestones'
import { ProgressBar } from '../MilestoneTable'
import { MemberSection } from './MemberSection'

const COLUMNS: Column<MilestoneStanding>[] = [
  {
    key: 'category',
    header: 'Milestone',
    render: (r) => (
      <span className="flex items-center gap-2 whitespace-nowrap font-semibold">
        <span className="text-accent">{META[r.category].icon}</span>
        {META[r.category].label}
        {isOnWatch(r) && <span className="text-xs font-bold uppercase tracking-wide text-notable">On watch</span>}
      </span>
    ),
  },
  { key: 'value', header: 'Current', align: 'right', render: (r) => FORMAT[r.category](r.value) },
  { key: 'next', header: 'Next', align: 'right', render: (r) => (r.next === null ? '—' : FORMAT[r.category](r.next)) },
  { key: 'remaining', header: 'To go', align: 'right', render: (r) => (r.remaining === null ? '—' : FORMAT[r.category](r.remaining)) },
  { key: 'progress', header: 'Progress', render: (r) => (r.progress === null ? 'All reached' : <ProgressBar progress={r.progress} />) },
  {
    key: 'achieved',
    header: 'Reached',
    render: (r) =>
      r.achieved.length === 0 ? (
        <span className="text-muted">—</span>
      ) : (
        <span className="whitespace-nowrap text-muted">{r.achieved.map((a) => `${FORMAT[r.category](a.milestone)} (${a.year})`).join(' · ')}</span>
      ),
  },
]

/** Milestones: this member's own line from Milestone Watch, every category. */
export function MemberMilestones({ memberId, seasons, tournaments }: { memberId: string; seasons: SeasonData[]; tournaments: Tournament[] }) {
  const standings = useMemo(() => milestoneStandings(seasons, tournaments), [seasons, tournaments])
  const rows = useMemo(() => memberMilestones(standings, memberId), [standings, memberId])
  return (
    <MemberSection
      title="Milestones"
      note={
        <>
          Career totals against the <Link to="/milestones" className="text-accent hover:underline">Milestone Watch</Link> marks.
        </>
      }
    >
      <DataTable columns={COLUMNS} rows={rows} getRowKey={(r) => r.category} stickyFirstColumn />
    </MemberSection>
  )
}
