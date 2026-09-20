import { Link } from 'react-router-dom'
import { getMember } from '@/config'
import type { MilestoneStanding } from '@/selectors'
import { MILESTONE_FORMAT, MILESTONE_META } from '../milestones'
import { TeamLogo } from '../TeamLogo'
import { RecapPanel } from './RecapPanel'

/**
 * Career marks about to fall.
 *
 * The one block here that isn't about the week: a milestone is a career thing, and the reason it
 * belongs in a weekly recap is that it is the only warning anyone gets before it happens. Members
 * are shown closest-first, by what's left rather than by percentage, because "84 points away" is
 * the sentence the newsletter prints.
 */

const teamName = (memberId: string) => getMember(memberId)?.name ?? memberId

function Row({ row }: { row: MilestoneStanding }) {
  const format = MILESTONE_FORMAT[row.category]
  return (
    <div className="flex min-w-0 items-center gap-2 bg-surface px-3 py-2">
      <TeamLogo ffuId={row.memberId} size={24} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold leading-tight">{teamName(row.memberId)}</div>
        <div className="truncate text-[11px] leading-tight text-muted">
          {format(row.value)} · {MILESTONE_META[row.category].label}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-base font-bold leading-tight tabular-nums">{format(row.next ?? 0)}</div>
        <div className="font-mono text-[11px] leading-tight tabular-nums text-muted">
          {format(row.remaining ?? 0)} to go
        </div>
      </div>
    </div>
  )
}

export function WeekMilestones({
  rows,
  year,
  week,
  compact,
  copyFilename,
}: {
  rows: MilestoneStanding[]
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  if (rows.length === 0) return null
  return (
    <RecapPanel
      title="Milestone Watch"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      <div className="flex flex-col gap-px bg-border">
        {rows.map((row) => (
          <Row key={`${row.memberId}-${row.category}`} row={row} />
        ))}
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
