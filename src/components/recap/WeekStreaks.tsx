import { FaFire, FaSnowflake } from 'react-icons/fa6'
import { nameForYear } from '@/config'
import type { Streak } from '@/selectors'
import { LEAGUE_STYLES } from '../leagues'
import { TeamLogo } from '../TeamLogo'
import { RecapPanel } from './RecapPanel'

/**
 * Who's on a run, both ways.
 *
 * A run that covers every game played gets said out loud — "still unbeaten", "still winless" —
 * because that is the line the league actually repeats, and it is the difference between a good
 * month and a season that hasn't started yet.
 */

function note(streak: Streak): string {
  const perfect = streak.length === streak.gamesPlayed
  if (streak.kind === 'W') return perfect ? 'still unbeaten' : `since week ${streak.fromWeek}`
  return perfect ? 'still winless' : `since week ${streak.fromWeek}`
}

function StreakRow({ streak, year }: { streak: Streak; year: string }) {
  const style = LEAGUE_STYLES[streak.tier]
  return (
    <div className="flex min-w-0 items-center gap-2 px-3 py-2">
      <span aria-hidden className={`h-6 w-1 shrink-0 ${style.dot}`} />
      <TeamLogo ffuId={streak.memberId} size={24} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold leading-tight">
          {nameForYear(streak.memberId, year) ?? streak.memberId}
        </div>
        <div className={`text-[11px] font-semibold uppercase tracking-wider ${style.text}`}>{style.label}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-base font-bold leading-tight tabular-nums">
          {streak.length}
          {streak.kind}
        </div>
        <div className="text-[11px] leading-tight text-muted">{note(streak)}</div>
      </div>
    </div>
  )
}

function Column({ title, icon, streaks, year }: { title: string; icon: React.ReactNode; streaks: Streak[]; year: string }) {
  return (
    <div className="min-w-0 bg-surface">
      <div className="flex items-center gap-2 px-3 pt-2 text-[11px] font-bold uppercase tracking-widest text-muted">
        {icon}
        {title}
      </div>
      {streaks.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted">Nobody yet.</p>
      ) : (
        streaks.map((streak) => <StreakRow key={`${streak.tier}-${streak.memberId}`} streak={streak} year={year} />)
      )}
    </div>
  )
}

export function WeekStreaks({
  hot,
  cold,
  year,
  week,
  compact,
  copyFilename,
}: {
  hot: Streak[]
  cold: Streak[]
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  return (
    <RecapPanel
      title="Hot & Cold"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      <div className={compact ? 'grid gap-px bg-border sm:grid-cols-2' : 'grid gap-2 p-4 sm:grid-cols-2'}>
        <Column title="Winning runs" icon={<FaFire className="text-positive" aria-hidden />} streaks={hot} year={year} />
        <Column title="Losing runs" icon={<FaSnowflake className="text-negative" aria-hidden />} streaks={cold} year={year} />
      </div>
    </RecapPanel>
  )
}
