import { useMemo, useState } from 'react'
import type { LiveSeasonData, SeasonData } from '@/data'
import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useLiveWeek } from '@/hooks/useLiveWeek'
import { useLiveProjections } from '@/hooks/useLiveProjections'
import { useDraftSchedules } from '@/hooks/useDraftSchedules'
import { homeLiveSection, unionHighlight, upcomingYear } from '@/selectors'
import { HomeUnionPanel } from '@/components/HomeUnionPanel'
import { ChampionsByLeague } from '@/components/ChampionsByLeague'
import { LatestChampions, type LatestChampion } from '@/components/LatestChampions'
import { CurrentWeekMatchups, type OpenGame } from '@/components/CurrentWeekMatchups'
import { CurrentWeekStandings } from '@/components/CurrentWeekStandings'
import { LiveLineupModal } from '@/components/LiveLineupModal'
import { CupBanner } from '@/components/CupBanner'
import { UpcomingDrafts } from '@/components/UpcomingDrafts'
import { LEAGUE_STYLES, TIER_PRESTIGE } from '@/components/leagues'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const championOf = (season: SeasonData) => season.teams.find((t) => t.finalPlacement === 1)?.memberId

interface LiveTier {
  tier: Tier
  data: LiveSeasonData
}

/** The id each league's live block carries, so the jump links above the grid can target it. */
const leagueAnchor = (tier: Tier) => `week-${tier.toLowerCase()}`

/**
 * Jump links to each league's block. On a phone the three stack, and National starts a couple of
 * screens down; these are anchors, not a filter, so every league stays on the page. The text uses
 * the tier's readable foreground, not its solid color (Premier gold fails contrast as text).
 */
function LeagueJumpLinks({ tiers }: { tiers: Tier[] }) {
  return (
    <nav aria-label="Jump to league" className="flex flex-wrap gap-x-2 text-sm font-semibold">
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

/**
 * The one live block on the home page: this week's matchups, or — on Tuesdays, once a week has
 * finished — the standings they produced. One or the other, never both, so the page leads with
 * whichever is actually worth reading that day (see homeLiveSection).
 */
function LiveSection({
  tiers,
  week,
  showStandings,
  onOpen,
}: {
  tiers: LiveTier[]
  week: number | undefined
  showStandings: boolean
  onOpen: (open: OpenGame) => void
}) {
  const projections = useLiveProjections(
    tiers.map((t) => t.data),
    !showStandings,
  )
  const heading = showStandings ? `Standings${week ? ` — Through Week ${week - 1}` : ''}` : week ? `Week ${week}` : 'This Week'
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted">{heading}</h2>
      <LeagueJumpLinks tiers={tiers.map((t) => t.tier)} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </section>
  )
}

export function Overview() {
  const { data: seasons, loading, error } = useAllSeasons()
  // One nullable-unwrap for the whole page: every selector below takes the same array.
  const allSeasons = useMemo(() => seasons ?? [], [seasons])
  const liveWeek = useLiveWeek()
  const [open, setOpen] = useState<OpenGame | null>(null)
  // Years that have a CHAMPION, which is not the same as years with data. The season being played
  // has a file from the day its leagues are created and keeps it all season, but nobody wins it
  // until the playoffs are done — so counting it here would head the page "2026 Champions" over
  // three blank slots, and open the Champions by Season table with an empty row. Both `years` and
  // `latest` below feed champions views only. A season joins them the moment it has a winner.
  const { years, champions } = useMemo(() => {
    const champions = new Map<string, string>() // `${year}|${tier}` -> memberId
    const yearSet = new Set<string>()
    for (const s of allSeasons) {
      const id = championOf(s)
      if (!id) continue
      yearSet.add(s.year)
      champions.set(`${s.year}|${s.tier}`, id)
    }
    return { years: [...yearSet].sort().reverse(), champions }
  }, [allSeasons])

  const latest = years[0]
  // The season being played, from config — not `latest + 1`, which skips past it once it has a
  // data file of its own (see upcomingYear).
  const nextYear = upcomingYear(allSeasons)
  const { schedules: draftSchedules } = useDraftSchedules(nextYear)
  const union = useMemo(() => unionHighlight(allSeasons, nextYear), [allSeasons, nextYear])
  const latestChampions: LatestChampion[] = useMemo(
    () =>
      latest
        ? tiersForYear(latest).map((tier: Tier) => ({ tier, memberId: champions.get(`${latest}|${tier}`) }))
        : [],
    [latest, champions],
  )

  const liveTiers = TIER_PRESTIGE.flatMap((tier) => {
    const data = liveWeek.byTier[tier]
    return data ? [{ tier, data }] : []
  })
  const currentWeekNumber = liveTiers[0]?.data.currentWeek
  // Tuesday leads with the standings instead of the matchups (see homeLiveSection) — but only once
  // a week has actually finished, otherwise there is nothing in them and the matchups stay.
  const showStandings = homeLiveSection() === 'standings' && liveTiers.some(({ data }) => data.currentWeek > 1)

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">Fantasy Football Union</h1>
      {/* While a week is live it leads the page: it's what people come for on a game day, and
          behind the Cup promo and last week's Around the Union it started a screen and a half down
          on a phone. Gate on the DATA (not just inScope): inScope flips true as soon as the tiny
          nfl-state fetch resolves, but the per-tier season fetches take longer — and can fail.
          Keying off liveTiers keeps the section headings from rendering over an empty (or
          permanently failed) grid. With no live week, the order is Cup, then Around the Union. */}
      {liveTiers.length > 0 && (
        <LiveSection tiers={liveTiers} week={currentWeekNumber} showStandings={showStandings} onOpen={setOpen} />
      )}
      <CupBanner />
      <HomeUnionPanel highlight={union} />
      <UpcomingDrafts year={nextYear} schedules={draftSchedules} />
      {latest && <LatestChampions year={latest} champions={latestChampions} />}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Champions by Season</h2>
        <ChampionsByLeague years={years} champions={champions} />
      </section>
      {open && (
        <LiveLineupModal
          leagueId={open.leagueId}
          year={open.year}
          week={open.game.week}
          memberIds={open.game.participants.map((p) => p.memberId) as [string, string]}
          scoreOf={(memberId) => open.game.participants.find((p) => p.memberId === memberId)?.score}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
