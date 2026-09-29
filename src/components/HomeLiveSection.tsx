import type { ReactNode } from 'react'
import type { Tier } from '@/config'
import type { LiveSeasonData } from '@/data'
import { useAfterIdle } from '@/hooks/useAfterIdle'
import { useLiveProjections } from '@/hooks/useLiveProjections'
import { CurrentWeekMatchups, type OpenGame } from './CurrentWeekMatchups'
import { CurrentWeekStandings } from './CurrentWeekStandings'
import { LEAGUE_STYLES, TIER_PRESTIGE } from './leagues'
import { TabPanel, Tabs, type TabDef } from './Tabs'

/** Tuesday's choice between the week just finished and the one now starting (see LiveBlock). */
export interface WeekTabs {
  tabs: readonly TabDef[]
  value: string
  onChange: (id: string) => void
}

export interface LiveTier {
  tier: Tier
  data: LiveSeasonData
}

const HEADING = 'text-sm font-bold uppercase tracking-widest text-muted'

/** The id each league's live block carries, so the jump links above the grid can target it. */
const leagueAnchor = (tier: Tier) => `week-${tier.toLowerCase()}`

/**
 * Jump links to each league's block. On a phone the three stack, and National starts a couple of
 * screens down; these are anchors, not a filter, so every league stays on the page. The text uses
 * the tier's readable foreground, not its solid color (Premier gold fails contrast as text).
 * Hidden from `lg` up, where the grid puts all three leagues side by side and there's nowhere to jump.
 */
function LeagueJumpLinks({ tiers }: { tiers: Tier[] }) {
  return (
    <nav aria-label="Jump to league" className="flex flex-wrap gap-x-2 text-sm font-semibold lg:hidden">
      {tiers.map((tier, i) => (
        <span key={tier} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden className="text-muted">·</span>}
          <a href={`#${leagueAnchor(tier)}`} className={`${LEAGUE_STYLES[tier].readableText} underline-offset-2 hover:underline`}>
            {LEAGUE_STYLES[tier].label}
          </a>
        </span>
      ))}
    </nav>
  )
}

function LeagueGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

/**
 * The one live block on the home page: this week's matchups (on Tuesday, last week's finals), or —
 * on Wednesdays, once a week has finished — the standings they produced. One or the other, never
 * both, so the page leads with whichever is actually worth reading that day (see homeLiveSection).
 *
 * Projections wait until the scores have painted (useAfterIdle): their feed is ~237KB gzipped, and
 * the scores are what the reader came for.
 */
export function HomeLiveSection({
  tiers,
  week,
  showStandings,
  final = false,
  asOf,
  onOpen,
  weekTabs,
}: {
  tiers: LiveTier[]
  week: number | undefined
  showStandings: boolean
  /** The matchups are a finished week's (Tuesday): headed as final, and nothing left to project. */
  final?: boolean
  /** When the scores were last read; each new read refreshes the projections beside them. */
  asOf: number | undefined
  onOpen: (open: OpenGame) => void
  weekTabs?: WeekTabs
}) {
  const projecting = !showStandings && !final
  const painted = useAfterIdle(projecting)
  const projections = useLiveProjections(
    tiers.map((t) => t.data),
    projecting && painted,
    asOf,
  )
  const heading = showStandings ? `Standings${week ? ` — Through Week ${week - 1}` : ''}` : week ? `Week ${week}${final ? ' · Final' : ''}` : 'This Week'
  return (
    <section className="space-y-3">
      <h2 className={HEADING}>{heading}</h2>
      {weekTabs && <Tabs tabs={weekTabs.tabs} value={weekTabs.value} onChange={weekTabs.onChange} label="Which week" />}
      <LeagueJumpLinks tiers={tiers.map((t) => t.tier)} />
      <MaybeTabPanel id={weekTabs?.value}>
        <LeagueGrid>
          {/* scroll-mt clears the sticky header, which would otherwise cover the league's heading. */}
          {tiers.map(({ tier, data }) => (
            <div key={tier} id={leagueAnchor(tier)} className="min-w-0 scroll-mt-24">
              {showStandings ? (
                <CurrentWeekStandings tier={tier} data={data} />
              ) : (
                <CurrentWeekMatchups tier={tier} data={data} onOpen={onOpen} projected={(memberId) => projections.get(memberId)} />
              )}
            </div>
          ))}
        </LeagueGrid>
      </MaybeTabPanel>
    </section>
  )
}

/** The grid is a tab panel only while there are tabs to label it. */
function MaybeTabPanel({ id, children }: { id: string | undefined; children: ReactNode }) {
  return id === undefined ? <>{children}</> : <TabPanel id={id}>{children}</TabPanel>
}

/**
 * Holds the live section's place while its data loads, so the page below doesn't jump down a
 * screen when the scores arrive: the same heading, jump-link row and league columns, each at about
 * a real column's height as it first paints (six matchup cards; measured 604–668px at 390 and 1280).
 */
export function HomeLiveSectionPlaceholder() {
  return (
    <section className="space-y-3" role="status" aria-label="Loading this week's scores">
      <h2 className={HEADING}>This Week</h2>
      <div aria-hidden className="h-5 lg:hidden" />
      <LeagueGrid>
        {TIER_PRESTIGE.map((tier) => (
          <div key={tier} aria-hidden className="border border-border bg-surface shadow-sm">
            <div className={`px-3 py-2 text-sm font-bold uppercase tracking-wide ${LEAGUE_STYLES[tier].solidHeader}`}>{LEAGUE_STYLES[tier].label}</div>
            <div className="h-[37.5rem] animate-pulse bg-surface-2/40" />
          </div>
        ))}
      </LeagueGrid>
    </section>
  )
}
