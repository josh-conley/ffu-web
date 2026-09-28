import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FaFlagCheckered, FaHourglassHalf } from 'react-icons/fa6'
import { getMember } from '@/config'
import type { MilestoneReached, MilestoneStanding } from '@/selectors'
import { MILESTONE_FORMAT, MILESTONE_META } from '../milestones'
import { MilestoneReachedRow } from '../MilestoneReachedRow'
import { TeamLink } from '../TeamLink'
import { RecapPanel } from './RecapPanel'

/**
 * Career marks that just fell, and the ones about to.
 *
 * The reached list is the news — a milestone that falls stops being "watched", and without it
 * would vanish the very week the newsletter wants to write it up (see milestonesReachedRecently). The watch list is the only
 * warning anyone gets before one happens; it runs closest-first, by what's left rather than by
 * percentage, because "84 points away" is the sentence the newsletter prints.
 */

const teamName = (memberId: string) => getMember(memberId)?.name ?? memberId

function Row({ row }: { row: MilestoneStanding }) {
  const format = MILESTONE_FORMAT[row.category]
  return (
    <div className="flex min-w-0 items-center gap-2 bg-surface px-3 py-2">
      <TeamLink
        ffuId={row.memberId}
        logoSize={24}
        className="flex-1 gap-2"
        detail={
          <span className="truncate text-[11px] leading-tight text-muted">
            {format(row.value)} · {MILESTONE_META[row.category].label}
          </span>
        }
      >
        <span className="truncate text-sm font-bold leading-tight">{teamName(row.memberId)}</span>
      </TeamLink>
      <div className="shrink-0 text-right">
        <div className="font-mono text-base font-bold leading-tight tabular-nums">{format(row.next ?? 0)}</div>
        <div className="font-mono text-[11px] leading-tight tabular-nums text-muted">
          {format(row.remaining ?? 0)} to go
        </div>
      </div>
    </div>
  )
}

function Group({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-px">
      <div className="flex items-center gap-2 bg-surface px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-muted">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

export function WeekMilestones({
  reached,
  rows,
  year,
  week,
  compact,
  copyFilename,
}: {
  reached: MilestoneReached[]
  rows: MilestoneStanding[]
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  if (reached.length === 0 && rows.length === 0) return null
  return (
    <RecapPanel
      title="Milestone Watch"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      <div className="flex flex-col gap-px bg-border">
        {reached.length > 0 && (
          <Group title="Recently reached" icon={<FaFlagCheckered className="text-notable" aria-hidden />}>
            {reached.map((r) => (
              <MilestoneReachedRow key={`${r.memberId}-${r.category}-${r.milestone}`} reached={r} />
            ))}
          </Group>
        )}
        {rows.length > 0 && (
          <Group title="Closing in" icon={<FaHourglassHalf aria-hidden />}>
            {rows.map((row) => (
              <Row key={`${row.memberId}-${row.category}`} row={row} />
            ))}
          </Group>
        )}
        {!compact && (
          <div className="bg-surface px-3 py-2 text-sm text-muted">
            <Link to="/milestones" className="font-semibold text-text underline-offset-2 hover:underline">
              Every milestone on the board
            </Link>
          </div>
        )}
      </div>
    </RecapPanel>
  )
}
