import { Link } from 'react-router-dom'
import { FaCalendarDays } from 'react-icons/fa6'
import type { DraftSchedule } from '@/data'
import type { Tier } from '@/config'
import { draftPhase, type DraftPhase } from '@/selectors'
import { draftDateTime } from './format'
import { LEAGUE_STYLES, TIER_PRESTIGE } from './leagues'

/**
 * The drafts announcement: next season's dates before draft season, and a way in to the board while
 * a draft is running or once it's done. Deliberately styled as a single invitation panel (not the
 * column-card grid the champions section uses): a left accent rule, a headline, and the three
 * leagues as colored markers + names — no explanatory blurb, the dates speak for themselves (and
 * tier badges are intentionally omitted here too). Dates and status come live from Sleeper
 * (useDraftSchedules) so a tier fills itself in the moment the commissioner sets it — a tier with no
 * date yet reads TBD.
 */

const boardHref = (year: string | undefined, tier: Tier) => `/drafts${year ? `?year=${year}&tier=${tier}` : `?tier=${tier}`}`

/** The right-hand half of a league's row: its date, or a way through to the board. */
function DraftStatus({ phase, startTime, year, tier }: { phase: DraftPhase; startTime: number | null; year?: string; tier: Tier }) {
  const link = 'underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

  if (phase === 'live') {
    return (
      <Link to={boardHref(year, tier)} className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent ${link}`}>
        <span aria-hidden className="size-2 shrink-0 animate-pulse bg-accent" />
        Drafting now — watch the board
      </Link>
    )
  }
  if (phase === 'complete') {
    return (
      <Link to={boardHref(year, tier)} className={`text-xs font-semibold uppercase tracking-wide text-muted ${link}`}>
        Draft complete — see the board
      </Link>
    )
  }
  if (startTime === null) return <span className="text-xs font-semibold uppercase tracking-wide text-muted">— TBD</span>
  return (
    <span className="text-xs font-semibold uppercase tracking-wide">
      <span className="text-muted">— </span>
      <time dateTime={new Date(startTime).toISOString()}>{draftDateTime(startTime)}</time>
    </span>
  )
}

/** Headline that matches whatever draft season is doing right now. */
function headline(year: string | undefined, phases: DraftPhase[]): string {
  const prefix = year ? `${year} ` : ''
  if (phases.includes('live')) return `${prefix}Draft Night Is Live`
  if (phases.length > 0 && phases.every((p) => p === 'complete')) return `${prefix}Drafts Are Done`
  return `${prefix}Draft Season Is Coming`
}

export function UpcomingDrafts({ year, schedules = [] }: { year?: string; schedules?: DraftSchedule[] }) {
  const scheduleFor = (tier: Tier) => schedules.find((s) => s.tier === tier)
  const phaseFor = (tier: Tier): DraftPhase => {
    const schedule = scheduleFor(tier)
    return schedule ? draftPhase(schedule) : 'upcoming'
  }
  const phases = TIER_PRESTIGE.map(phaseFor)
  const anyLive = phases.includes('live')

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted">{anyLive ? 'Drafts' : 'Upcoming Drafts'}</h2>
      <div className="flex items-start gap-4 border border-border border-l-4 border-l-accent bg-surface p-5 shadow-sm sm:p-6">
        <FaCalendarDays className="mt-0.5 shrink-0 text-2xl text-accent" aria-hidden />
        <div className="min-w-0 space-y-4">
          <h3 className="text-lg font-extrabold uppercase tracking-tight">{headline(year, phases)}</h3>
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {TIER_PRESTIGE.map((tier) => (
              <li key={tier} className="flex items-center gap-2">
                <span aria-hidden className={`size-3 shrink-0 ${LEAGUE_STYLES[tier].dot}`} />
                <span className={`font-bold ${LEAGUE_STYLES[tier].text}`}>{LEAGUE_STYLES[tier].label}</span>
                <DraftStatus phase={phaseFor(tier)} startTime={scheduleFor(tier)?.startTime ?? null} year={year} tier={tier} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
