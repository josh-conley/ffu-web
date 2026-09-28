import { FaTrophy } from 'react-icons/fa6'
import { nameForYear } from '@/config'
import type { LeaguePointsRow, WeekScore } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'
import { TeamLink } from './TeamLink'

/**
 * The FFUN layout: the same two blocks as the standard board, folded into horizontal bands instead
 * of a vertical stack, because the newsletter has a fixed slot on page 2 and vertical space is the
 * scarce thing there.
 *
 * Three bands where the standard view takes a screenful — leader beside its runners-up, then one
 * strip carrying all three leagues. The section headings go too: the newsletter's own page supplies
 * that context, so repeating it inside the screenshot just costs rows.
 *
 * Type steps down below `sm` throughout. The bands sit side by side from `sm` up and stack on a
 * phone, where a name has the width of a handset rather than half a panel — at the newsletter's
 * sizes the longer team names truncate. Every size here is therefore a mobile size with an `sm:`
 * override carrying the capture's own, so the screenshot is untouched.
 */

const POINTS = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Leader({ score, year }: { score: WeekScore; year: string }) {
  const style = LEAGUE_STYLES[score.tier]
  return (
    <div className={`flex min-w-0 items-center gap-3 px-3 py-2.5 sm:flex-1 ${style.solidHeader}`}>
      <FaTrophy className="shrink-0 text-2xl" aria-hidden />
      <TeamLink
        ffuId={score.memberId}
        logoSize={40}
        className="flex-1 gap-3"
        detail={
          <span className="font-mono text-xs font-bold leading-tight opacity-90 sm:text-sm">
            {score.score.toFixed(2)} · {style.label}
          </span>
        }
      >
        <span className="truncate text-base font-extrabold uppercase leading-tight tracking-tight sm:text-xl">
          {nameForYear(score.memberId, year) ?? score.memberId}
        </span>
      </TeamLink>
    </div>
  )
}

/** Runners-up ride the same band as the leader, on a darker panel — the newsletter stacks them
 *  tight against its hero rather than giving each a row of its own. */
function RunnerUp({ score, year }: { score: WeekScore; year: string }) {
  const style = LEAGUE_STYLES[score.tier]
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 bg-surface-2 px-3 py-2.5">
      <span aria-hidden className={`h-6 w-1 shrink-0 ${style.dot}`} />
      <TeamLink ffuId={score.memberId} logoSize={26}>
        <span className="truncate text-sm font-bold leading-tight sm:text-base">{nameForYear(score.memberId, year) ?? score.memberId}</span>
      </TeamLink>
      <span className="ml-auto shrink-0 font-mono text-sm font-bold tabular-nums sm:text-base">{score.score.toFixed(2)}</span>
      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider sm:text-[11px] ${style.text}`}>{style.label}</span>
    </div>
  )
}

/**
 * All three leagues on one line: the newsletter's "Avg Game / Total League Points" footer, down to
 * the paired chips — average in the solid tier color, total in its soft one.
 *
 * This band is what sets the captured panel's width, so from `sm` up it may NOT wrap: the copy
 * renders a clone of the DOM whose layout is re-run with slightly different font metrics, and with
 * wrapping allowed a hair of extra width drops National onto a second line the PNG then crops. The
 * chips never shrink either — they are the numbers — and the trailing padding leaves a few pixels
 * for the clone to be wider in.
 *
 * A phone can't hold that line — three labelled pairs need roughly twice a handset's width — so
 * below `sm` it becomes a row per league instead of a wrapped queue of chips: label hard left,
 * numbers hard right. Letting them wrap left-aligned instead started each league at whatever column
 * the previous one happened to end at, which read as three ragged fragments rather than three
 * leagues. Justified, every league's numbers finish on the same edge and the labels start on it.
 *
 * The newsletter leaves those chips unlabelled and lets the colors speak. Here they keep a short
 * league label: color alone is the sole encoding otherwise, which fails anyone who can't separate
 * gold from red, and the page has to work on screen as well as in the crop.
 */
function LeagueStrip({ race }: { race: LeaguePointsRow[] }) {
  return (
    <div className="flex flex-col gap-1 bg-surface py-2 pl-3 pr-5 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-x-3 sm:gap-y-1">
      <span className="text-[10px] font-bold uppercase leading-tight tracking-widest text-muted">
        Avg Game / Total League Points
      </span>
      {race.map((row) => {
        const style = LEAGUE_STYLES[row.tier]
        return (
          <span key={row.tier} className="flex items-center justify-between gap-1 whitespace-nowrap sm:shrink-0 sm:justify-start">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>{style.label}</span>
            {/* The pair travels together: on a phone it is what gets pushed to the right edge, and
                from `sm` up the wrapper is inert — same gap, same order, same single line. */}
            <span className="flex items-center gap-1">
              <span className={`px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums ${style.solidHeader}`}>
                {row.averageGame.toFixed(2)}
              </span>
              <span className={`px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums ${style.badge}`}>
                {POINTS.format(row.totalPoints)}
              </span>
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
