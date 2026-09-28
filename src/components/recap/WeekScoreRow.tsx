import { nameForYear } from '@/config'
import type { WeekScore } from '@/selectors'
import { LEAGUE_STYLES } from '../leagues'
import { TeamLink } from '../TeamLink'
import { ordinal } from '../format'

/**
 * One team's week, as a row: where it placed, who it was, and what it scored.
 *
 * Shared by both ends of the week — the top scorers' runners-up and the low-score block read
 * identically, since `rank` counts from the best score of the week at both ends (1st … 36th).
 */
export function WeekScoreRow({ score, year }: { score: WeekScore; year: string }) {
  const style = LEAGUE_STYLES[score.tier]
  return (
    <div className={`flex items-center gap-3 border-l-4 ${style.border} bg-surface px-3 py-2 shadow-sm`}>
      <span className="w-9 shrink-0 text-center font-mono text-sm font-bold tabular-nums text-muted">
        {ordinal(score.rank)}
      </span>
      <TeamLink
        ffuId={score.memberId}
        logoSize={28}
        className="flex-1 gap-3"
        detail={<span className={`text-[11px] font-semibold uppercase tracking-wider ${style.text}`}>{style.label}</span>}
      >
        <span className="truncate text-sm font-bold">{nameForYear(score.memberId, year) ?? score.memberId}</span>
      </TeamLink>
      <span className="shrink-0 font-mono text-base font-bold tabular-nums">{score.score.toFixed(2)}</span>
    </div>
  )
}

/** The same row folded onto one line, for the newsletter's bands. */
export function WeekScoreChip({ score, year }: { score: WeekScore; year: string }) {
  const style = LEAGUE_STYLES[score.tier]
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 bg-surface-2 px-3 py-2.5">
      <span aria-hidden className={`h-6 w-1 shrink-0 ${style.dot}`} />
      <TeamLink ffuId={score.memberId} logoSize={26}>
        <span className="truncate text-base font-bold leading-tight">
          {nameForYear(score.memberId, year) ?? score.memberId}
        </span>
      </TeamLink>
      <span className="ml-auto shrink-0 font-mono text-base font-bold tabular-nums">{score.score.toFixed(2)}</span>
      <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wider ${style.text}`}>{style.label}</span>
    </div>
  )
}
