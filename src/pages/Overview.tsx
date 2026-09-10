import { useMemo, useState } from 'react'
import type { LiveSeasonData, SeasonData } from '@/data'
import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useLiveWeek } from '@/hooks/useLiveWeek'
import { useLeagueRosters } from '@/hooks/useLeagueRosters'
import { useDraftSchedules } from '@/hooks/useDraftSchedules'
import { homeLiveSection, upcomingRosters, upcomingYear } from '@/selectors'
import { ChampionsByLeague } from '@/components/ChampionsByLeague'
import { LatestChampions, type LatestChampion } from '@/components/LatestChampions'
import { CurrentWeekMatchups, type OpenGame } from '@/components/CurrentWeekMatchups'
import { CurrentWeekStandings } from '@/components/CurrentWeekStandings'
import { LiveLineupModal } from '@/components/LiveLineupModal'
import { CupBanner } from '@/components/CupBanner'
import { UpcomingDrafts } from '@/components/UpcomingDrafts'
import { UpcomingLeagues } from '@/components/UpcomingLeagues'
import { TIER_PRESTIGE } from '@/components/leagues'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const championOf = (season: SeasonData) => season.teams.find((t) => t.finalPlacement === 1)?.memberId

interface LiveTier {
  tier: Tier
  data: LiveSeasonData
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
  const heading = showStandings
    ? `Standings${week ? ` — Through Week ${week - 1}` : ''}`
    : `This Week${week ? ` — Week ${week}` : ''}`
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted">{heading}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map(({ tier, data }) =>
          showStandings ? (
            <CurrentWeekStandings key={tier} tier={tier} data={data} />
          ) : (
            <CurrentWeekMatchups key={tier} tier={tier} data={data} onOpen={onOpen} />
          ),
        )}
      </div>
    </section>
  )
}

export function Overview() {
  const { data: seasons, loading, error } = useAllSeasons()
  const liveWeek = useLiveWeek()
  const [open, setOpen] = useState<OpenGame | null>(null)
  const { years, champions } = useMemo(() => {
    const champions = new Map<string, string>() // `${year}|${tier}` -> memberId
    const yearSet = new Set<string>()
    for (const s of seasons ?? []) {
      yearSet.add(s.year)
      const id = championOf(s)
      if (id) champions.set(`${s.year}|${s.tier}`, id)
    }
    return { years: [...yearSet].sort().reverse(), champions }
  }, [seasons])

  const latest = years[0]
  // The season being played, from config — not `latest + 1`, which skips past it once it has a
  // data file of its own (see upcomingYear).
  const nextYear = upcomingYear(seasons ?? [])
  const { rosters } = useLeagueRosters(nextYear)
  const { schedules: draftSchedules } = useDraftSchedules(nextYear)
  const upcoming = useMemo(() => upcomingRosters(seasons ?? [], rosters), [seasons, rosters])
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
      <CupBanner />
      {/* Gate on the DATA (not just inScope): inScope flips true as soon as the tiny nfl-state fetch
          resolves, but the per-tier season fetches take longer — and can fail. Keying off liveTiers
          keeps the section headings from rendering over an empty (or permanently failed) grid. */}
      {liveTiers.length > 0 && (
        <LiveSection tiers={liveTiers} week={currentWeekNumber} showStandings={showStandings} onOpen={setOpen} />
      )}
      <UpcomingDrafts year={nextYear} schedules={draftSchedules} />
      {nextYear && <UpcomingLeagues year={nextYear} rosters={upcoming} />}
      {latest && <LatestChampions year={latest} champions={latestChampions} />}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Champions by Season</h2>
        <ChampionsByLeague years={years} champions={champions} />
      </section>
      {open && <LiveLineupModal leagueId={open.leagueId} year={open.year} game={open.game} onClose={() => setOpen(null)} />}
    </div>
  )
}
