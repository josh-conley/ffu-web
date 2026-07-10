import type { Tier } from '@/config'
import type { LiveSeasonData } from '@/data'
import { currentWeekMatchups, standingsThroughPreviousWeek } from '@/selectors'
import { LeagueBadge } from './LeagueBadge'
import { MatchupCard } from './MatchupCard'
import { CurrentWeekStandings } from './CurrentWeekStandings'

/** One tier's slice of the home page's "This Week" section: active-week matchups (live/in-progress
 *  scores) + standings through the last completed week. */
export function CurrentWeekPanel({ tier, data }: { tier: Tier; data: LiveSeasonData }) {
  const matchups = currentWeekMatchups(data)
  const standings = standingsThroughPreviousWeek(data)

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <LeagueBadge tier={tier} />
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Week {data.currentWeek}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {matchups.map((game) => (
          <MatchupCard key={game.participants.map((p) => p.memberId).join('-')} game={game} year={data.year} />
        ))}
      </div>
      {data.currentWeek > 1 ? (
        <CurrentWeekStandings rows={standings} year={data.year} />
      ) : (
        <p className="text-sm text-muted">Standings will appear once Week 1 concludes.</p>
      )}
    </section>
  )
}
