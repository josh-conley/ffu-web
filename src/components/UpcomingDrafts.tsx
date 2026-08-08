import { FaCalendarDays } from 'react-icons/fa6'
import type { DraftSchedule } from '@/data'
import { draftDateTime } from './format'
import { LEAGUE_STYLES, TIER_PRESTIGE } from './leagues'

/**
 * An announcement for next season's drafts. Deliberately styled as a single invitation panel (not the
 * column-card grid the champions section uses): a left accent rule, a headline, and the three leagues
 * as colored markers + names — no explanatory blurb, the dates speak for themselves (and tier badges
 * are intentionally omitted here too). Dates come live from Sleeper
 * (useDraftSchedules) so a tier fills itself in the moment the commissioner sets it — a tier with no
 * date yet reads TBD.
 */
export function UpcomingDrafts({ year, schedules = [] }: { year?: string; schedules?: DraftSchedule[] }) {
  const startTimeFor = (tier: string) => schedules.find((s) => s.tier === tier)?.startTime ?? null

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Upcoming Drafts</h2>
      <div className="flex items-start gap-4 border border-border border-l-4 border-l-accent bg-surface p-5 shadow-sm sm:p-6">
        <FaCalendarDays className="mt-0.5 shrink-0 text-2xl text-accent" aria-hidden />
        <div className="min-w-0 space-y-4">
          <h3 className="text-lg font-extrabold uppercase tracking-tight">
            {year ? `${year} ` : ''}Draft Season Is Coming
          </h3>
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {TIER_PRESTIGE.map((tier) => {
              const startTime = startTimeFor(tier)
              return (
                <li key={tier} className="flex items-center gap-2">
                  <span aria-hidden className={`size-3 shrink-0 ${LEAGUE_STYLES[tier].dot}`} />
                  <span className={`font-bold ${LEAGUE_STYLES[tier].text}`}>{LEAGUE_STYLES[tier].label}</span>
                  {startTime === null ? (
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">— TBD</span>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      <span className="text-muted">— </span>
                      <time dateTime={new Date(startTime).toISOString()}>{draftDateTime(startTime)}</time>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
