import { LEAGUE_STYLES, TIER_PRESTIGE } from './leagues'
import { LeagueBadge } from './LeagueBadge'

/**
 * Next season's draft, per league. Dates are TBD for all three tiers for now — the cards are
 * placeholders that will fill in once the commissioner sets the schedule.
 */
export function UpcomingDrafts() {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Upcoming Drafts</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {TIER_PRESTIGE.map((tier) => (
          <div key={tier} className="flex flex-col border border-border bg-surface shadow-sm">
            <span aria-hidden className={`h-1 ${LEAGUE_STYLES[tier].dot}`} />
            <div className="flex items-center justify-between gap-3 p-4">
              <LeagueBadge tier={tier} />
              <span className="font-bold uppercase tracking-wide text-muted">TBD</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
