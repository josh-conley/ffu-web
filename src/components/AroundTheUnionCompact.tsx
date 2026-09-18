import { FaTrophy } from 'react-icons/fa6'
import { nameForYear } from '@/config'
import type { LeaguePointsRow, WeekScore } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'
import { TeamLogo } from './TeamLogo'

/**
 * The FFUN layout: the same two blocks as the standard board, folded into horizontal bands instead
 * of a vertical stack, because the newsletter has a fixed slot on page 2 and vertical space is the
 * scarce thing there.
 *
 * Three bands where the standard view takes a screenful — leader beside its runners-up, then one
 * strip carrying all three leagues. The section headings go too: the newsletter's own page supplies
 * that context, so repeating it inside the screenshot just costs rows.
 */

const POINTS = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Leader({ score, year }: { score: WeekScore; year: string }) {
  const style = LEAGUE_STYLES[score.tier]
  return (
    <div className={`flex min-w-0 items-center gap-3 px-3 py-2 sm:flex-1 ${style.solidHeader}`}>
      <FaTrophy className="shrink-0 text-xl" aria-hidden />
      <TeamLogo ffuId={score.memberId} size={34} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-extrabold uppercase leading-tight tracking-tight sm:text-lg">
          {nameForYear(score.memberId, year) ?? score.memberId}
        </div>
        <div className="font-mono text-xs font-bold leading-tight opacity-90">
          {score.score.toFixed(2)} · {style.label}
        </div>
      </div>
    </div>
  )
}

/** Runners-up ride the same band as the leader, on a darker panel — the newsletter stacks them
 *  tight against its hero rather than giving each a row of its own. */
function RunnerUp({ score, year }: { score: WeekScore; year: string }) {
  const style = LEAGUE_STYLES[score.tier]
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 bg-surface-2 px-3 py-1.5">
      <span aria-hidden className={`h-4 w-1 shrink-0 ${style.dot}`} />
      <span className="truncate text-sm font-bold leading-tight">{nameForYear(score.memberId, year) ?? score.memberId}</span>
      <span className="ml-auto shrink-0 font-mono text-sm font-bold tabular-nums">{score.score.toFixed(2)}</span>
      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${style.text}`}>{style.label}</span>
    </div>
  )
}

/**
 * All three leagues on one line: the newsletter's "Avg Game / Total League Points" footer, down to
 * the paired chips — average in the solid tier color, total in its soft one.
 *
 * The newsletter leaves those chips unlabelled and lets the colors speak. Here they keep a short
 * league label: color alone is the sole encoding otherwise, which fails anyone who can't separate
 * gold from red, and the page has to work on screen as well as in the crop.
 */
function LeagueStrip({ race }: { race: LeaguePointsRow[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface px-3 py-1.5">
      <span className="text-[10px] font-bold uppercase leading-tight tracking-widest text-muted">
        Avg Game / Total League Points
      </span>
      {race.map((row) => {
        const style = LEAGUE_STYLES[row.tier]
        return (
          <span key={row.tier} className="flex items-center gap-1 whitespace-nowrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>{style.label}</span>
            <span className={`px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums ${style.solidHeader}`}>
              {row.averageGame.toFixed(2)}
            </span>
            <span className={`px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums ${style.badge}`}>
              {POINTS.format(row.totalPoints)}
            </span>
          </span>
        )
      })}
    </div>
  )
}

export function AroundTheUnionCompact({
  year,
  scores,
  race,
}: {
  year: string
  scores: WeekScore[]
  race: LeaguePointsRow[]
}) {
  const [leader, ...rest] = scores
  return (
    // gap-px over the border color draws the hairlines between bands without stacking borders.
    <div className="flex flex-col gap-px bg-border">
      <div className="flex flex-col gap-px sm:flex-row">
        {leader && <Leader score={leader} year={year} />}
        <div className="flex min-w-0 flex-col gap-px sm:w-1/2">
          {rest.map((score) => (
            <RunnerUp key={`${score.tier}-${score.memberId}`} score={score} year={year} />
          ))}
        </div>
      </div>
      <LeagueStrip race={race} />
    </div>
  )
}
