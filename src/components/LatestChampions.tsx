import { Link } from 'react-router-dom'
import type { Tier } from '@/config'
import { nameForYear } from '@/config'
import { LEAGUE_STYLES } from './leagues'
import { LeagueBadge } from './LeagueBadge'
import { TeamLogo } from './TeamLogo'

export interface LatestChampion {
  tier: Tier
  memberId: string | undefined
}

/**
 * Front-door hero: the most recent season's tier champions as prominent cards. Each card deep-links
 * into that tier-season's standings (carrying year+tier), so the landing page is an entry point
 * rather than a dead end.
 */
export function LatestChampions({ year, champions }: { year: string; champions: LatestChampion[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted">{year} Champions</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {champions.map(({ tier, memberId }) => (
          <Link
            key={tier}
            to={`/standings?year=${year}&tier=${tier}`}
            className="group flex flex-col border border-border bg-surface shadow-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span aria-hidden className={`h-1 ${LEAGUE_STYLES[tier].dot}`} />
            <div className="flex items-center gap-3 p-4">
              {memberId ? (
                <TeamLogo ffuId={memberId} size={44} />
              ) : (
                <span className="size-11 shrink-0 bg-surface-2" aria-hidden />
              )}
              <div className="min-w-0">
                <LeagueBadge tier={tier} />
                <div className="mt-1 truncate font-bold">
                  {memberId ? (nameForYear(memberId, year) ?? memberId) : '—'}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
