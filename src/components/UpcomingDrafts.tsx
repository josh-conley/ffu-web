import { FaCalendarDays } from 'react-icons/fa6'
import { LEAGUE_STYLES, TIER_PRESTIGE } from './leagues'

/**
 * An announcement for next season's drafts — dates TBD for all three leagues. Deliberately styled as
 * a single invitation panel (not the column-card grid the champions section uses): a left accent
 * rule, a headline, and the three leagues as colored markers + names (tier badges intentionally
 * omitted here). Fills in with real dates once the commissioner sets the schedule.
 */
export function UpcomingDrafts({ year }: { year?: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Upcoming Drafts</h2>
      <div className="flex items-start gap-4 border border-border border-l-4 border-l-accent bg-surface p-5 shadow-sm sm:p-6">
        <FaCalendarDays className="mt-0.5 shrink-0 text-2xl text-accent" aria-hidden />
        <div className="min-w-0 space-y-4">
          <div>
            <h3 className="text-lg font-extrabold uppercase tracking-tight">
              {year ? `${year} ` : ''}Draft Season Is Coming
            </h3>
            <p className="mt-1 text-sm text-muted">
              Be on the lookout for the availability poll — the commissioner will have everyone pick the dates and times
              they can make before locking in each league's draft.
            </p>
          </div>
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {TIER_PRESTIGE.map((tier) => (
              <li key={tier} className="flex items-center gap-2">
                <span aria-hidden className={`size-3 shrink-0 ${LEAGUE_STYLES[tier].dot}`} />
                <span className={`font-bold ${LEAGUE_STYLES[tier].text}`}>{LEAGUE_STYLES[tier].label}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">— TBD</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
