import { UPR_MIN_WEEKS, type LiveUprStatus } from '@/selectors'
import { segButton } from '@/components/controls'
import { TeamCell } from '@/components/TeamCell'
import type { UprOrder } from './uprExplorerState'

// The season in progress against history: where its best (or worst) team ranks among every
// team-season through the same week — or, when the chosen week is past what it has played, the
// one click that asks the question it can answer.

function Ranked({ status, order, week }: { status: Extract<LiveUprStatus, { kind: 'ranked' }>; order: UprOrder; week: number }) {
  const { year, top, outOf } = status
  return (
    <p>
      {order === 'high' ? 'The top' : 'The lowest-rated'} {year} team, <TeamCell ffuId={top.memberId} year={top.year} />, ranks{' '}
      <strong className="tabular-nums">#{top.rank}</strong> {order === 'high' ? 'of' : 'from the bottom of'}{' '}
      <span className="tabular-nums">{outOf}</span> team-seasons through week {week}.
    </p>
  )
}

function Behind({ status, onWeek }: { status: Extract<LiveUprStatus, { kind: 'behind' }>; onWeek: (week: number) => void }) {
  const { year, weeksPlayed, canRank } = status
  if (!canRank) {
    return <p>{year} has played {weeksPlayed} {weeksPlayed === 1 ? 'week' : 'weeks'}; it joins the table once it has {UPR_MIN_WEEKS}.</p>
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p>{year} has played {weeksPlayed} weeks, so it isn't in this table yet.</p>
      <button type="button" className={segButton(false)} onClick={() => onWeek(weeksPlayed)}>
        Rank {year} through week {weeksPlayed}
      </button>
    </div>
  )
}

export function UprLiveCallout({ status, order, week, onWeek }: { status: LiveUprStatus; order: UprOrder; week: number; onWeek: (week: number) => void }) {
  return (
    <div className="border border-border border-l-4 border-l-accent bg-surface px-4 py-3 text-sm">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-accent">{status.year} so far</span>
      {status.kind === 'ranked' ? <Ranked status={status} order={order} week={week} /> : <Behind status={status} onWeek={onWeek} />}
    </div>
  )
}
