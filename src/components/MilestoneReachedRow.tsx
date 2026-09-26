import { getMember } from '@/config'
import type { MilestoneReached } from '@/selectors'
import { MILESTONE_FORMAT, MILESTONE_META } from './milestones'
import { TeamLink } from './TeamLink'

const teamName = (memberId: string) => getMember(memberId)?.name ?? memberId

/**
 * A milestone that has just fallen, shared by the Milestones page and Around the Union so the two
 * say it the same way: the round number is the headline, the total it ended the week on beneath it
 * — but only when that says something. Wins arrive one at a time, so "50, now 50" would just repeat
 * itself; a points total lands somewhere past the line, and how far past is worth printing.
 */
export function MilestoneReachedRow({ reached }: { reached: MilestoneReached }) {
  const format = MILESTONE_FORMAT[reached.category]
  const now = format(reached.value)
  return (
    <div className="flex min-w-0 items-center gap-2 bg-surface px-3 py-2">
      <TeamLink
        ffuId={reached.memberId}
        logoSize={24}
        className="flex-1 gap-2"
        detail={
          <span className="truncate text-[11px] leading-tight text-muted">
            {MILESTONE_META[reached.category].label} · Week {reached.week}
          </span>
        }
      >
        <span className="truncate text-sm font-bold leading-tight">{teamName(reached.memberId)}</span>
      </TeamLink>
      <div className="shrink-0 text-right">
        <div className="font-mono text-base font-bold leading-tight tabular-nums text-notable">{format(reached.milestone)}</div>
        {now !== format(reached.milestone) && (
          <div className="font-mono text-[11px] leading-tight tabular-nums text-muted">now {now}</div>
        )}
      </div>
    </div>
  )
}
