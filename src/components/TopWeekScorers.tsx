import { FaTrophy } from 'react-icons/fa6'
import { nameForYear } from '@/config'
import type { WeekScore } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'
import { WeekScoreRow } from './recap/WeekScoreRow'
import { TeamLink } from './TeamLink'

/**
 * The week's biggest scores across all three leagues — the FFUN's page-2 staple.
 *
 * The leader gets the hero treatment and the rest a compact stack, mirroring the layout the
 * newsletter has used for years so a screenshot of this drops straight into the same slot.
 */

function Leader({ score, year }: { score: WeekScore; year: string }) {
  const style = LEAGUE_STYLES[score.tier]
  return (
    <div className={`flex items-center gap-4 border-l-4 ${style.border} bg-surface p-4 shadow-sm`}>
      <FaTrophy className={`shrink-0 text-3xl ${style.text}`} aria-hidden />
      <TeamLink
        ffuId={score.memberId}
        logoSize={48}
        className="flex-1 gap-4"
        detail={<span className={`text-xs font-bold uppercase tracking-widest ${style.text}`}>{style.label}</span>}
      >
        <span className="truncate text-lg font-extrabold uppercase tracking-tight sm:text-xl">
          {nameForYear(score.memberId, year) ?? score.memberId}
        </span>
      </TeamLink>
      <div className="shrink-0 text-right">
        <div className="font-mono text-2xl font-extrabold tabular-nums sm:text-3xl">{score.score.toFixed(2)}</div>
        <div className="text-[11px] uppercase tracking-widest text-muted">Week high</div>
      </div>
    </div>
  )
}

export function TopWeekScorers({ scores, year }: { scores: WeekScore[]; year: string }) {
  const [leader, ...rest] = scores
  if (leader === undefined) {
    return <p className="border border-dashed border-border bg-surface/60 p-4 text-sm text-muted">No completed week to report yet.</p>
  }
  return (
    <div className="space-y-2">
      <Leader score={leader} year={year} />
      {rest.map((score) => (
        <WeekScoreRow key={`${score.tier}-${score.memberId}`} score={score} year={year} />
      ))}
    </div>
  )
}
