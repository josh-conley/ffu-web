import { getMember } from '@/config'
import type { MilestoneReached } from '@/selectors'
import { MILESTONE_FORMAT, MILESTONE_META } from './milestones'
import { TeamLogo } from './TeamLogo'

const teamName = (memberId: string) => getMember(memberId)?.name ?? memberId

/**
 * A milestone that has just fallen, shared by the Milestones page and Around the Union so the two
 * say it the same way: the round number is the headline, the total it ended the week on beneath it.
 */
export function MilestoneReachedRow({ reached }: { reached: MilestoneReached }) {
  const format = MILESTONE_FORMAT[reached.category]
  return (
    <div className="flex min-w-0 items-center gap-2 bg-surface px-3 py-2">
      <TeamLogo ffuId={reached.memberId} size={24} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold leading-tight">{teamName(reached.memberId)}</div>
        <div className="truncate text-[11px] leading-tight text-muted">{MILESTONE_META[reached.category].label}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-base font-bold leading-tight tabular-nums text-notable">{format(reached.milestone)}</div>
        <div className="font-mono text-[11px] leading-tight tabular-nums text-muted">now {format(reached.value)}</div>
      </div>
    </div>
  )
}
