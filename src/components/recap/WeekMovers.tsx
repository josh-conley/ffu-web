import { FaArrowDown, FaArrowUp } from 'react-icons/fa6'
import { nameForYear } from '@/config'
import type { Mover } from '@/selectors'
import { LEAGUE_STYLES } from '../leagues'
import { TeamLink } from '../TeamLink'
import { RecapPanel } from './RecapPanel'

/**
 * Who moved in their own league's table this week.
 *
 * Places, not points: "up three" is the thing owners feel, and it is the only cross-league way to
 * compare a week — the three tables are separate competitions, so the move is always within one.
 */

function MoverRow({ mover, year }: { mover: Mover; year: string }) {
  const style = LEAGUE_STYLES[mover.tier]
  const climbed = mover.delta > 0
  return (
    <div className="flex min-w-0 items-center gap-2 px-3 py-2">
      <span aria-hidden className={`h-6 w-1 shrink-0 ${style.dot}`} />
      <TeamLink
        ffuId={mover.memberId}
        logoSize={24}
        className="flex-1 gap-2"
        detail={<span className={`text-[11px] font-semibold uppercase tracking-wider ${style.text}`}>{style.label}</span>}
      >
        <span className="truncate text-sm font-bold leading-tight">{nameForYear(mover.memberId, year) ?? mover.memberId}</span>
      </TeamLink>
      <div className="shrink-0 text-right">
        <div
          className={`flex items-center justify-end gap-1 font-mono text-base font-bold leading-tight tabular-nums ${climbed ? 'text-positive' : 'text-negative'}`}
        >
          {climbed ? <FaArrowUp aria-hidden /> : <FaArrowDown aria-hidden />}
          {Math.abs(mover.delta)}
        </div>
        <div className="font-mono text-[11px] leading-tight tabular-nums text-muted">
          {mover.from}
          {' → '}
          {mover.to}
        </div>
      </div>
    </div>
  )
}

function Column({ title, movers, year }: { title: string; movers: Mover[]; year: string }) {
  return (
    <div className="min-w-0 bg-surface">
      <div className="px-3 pt-2 text-[11px] font-bold uppercase tracking-widest text-muted">{title}</div>
      {movers.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted">Nobody moved.</p>
      ) : (
        movers.map((mover) => <MoverRow key={`${mover.tier}-${mover.memberId}`} mover={mover} year={year} />)
      )}
    </div>
  )
}

export function WeekMovers({
  risers,
  fallers,
  year,
  week,
  compact,
  copyFilename,
}: {
  risers: Mover[]
  fallers: Mover[]
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  // Nothing has moved in week 1 — there was no table before it (see weekMovers).
  if (risers.length === 0 && fallers.length === 0) return null
  return (
    <RecapPanel
      title="Risers & Fallers"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      <div className={compact ? 'grid gap-px bg-border sm:grid-cols-2' : 'grid gap-2 p-4 sm:grid-cols-2'}>
        <Column title="Up the table" movers={risers} year={year} />
        <Column title="Down the table" movers={fallers} year={year} />
      </div>
    </RecapPanel>
  )
}
