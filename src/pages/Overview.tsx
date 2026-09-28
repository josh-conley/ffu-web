import { useMemo, useState } from 'react'
import type { SeasonData } from '@/data'
import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useLiveWeek, type LiveWeek } from '@/hooks/useLiveWeek'
import { useDraftSchedules } from '@/hooks/useDraftSchedules'
import { homeLiveSection, unionHighlight, upcomingYear } from '@/selectors'
import { HomeUnionPanel } from '@/components/HomeUnionPanel'
import { ChampionsByLeague } from '@/components/ChampionsByLeague'
import { LatestChampions, type LatestChampion } from '@/components/LatestChampions'
import type { OpenGame } from '@/components/CurrentWeekMatchups'
import { HomeLiveSection, HomeLiveSectionPlaceholder } from '@/components/HomeLiveSection'
import { LiveLineupModal } from '@/components/LiveLineupModal'
import { CupBanner } from '@/components/CupBanner'
import { UpcomingDrafts } from '@/components/UpcomingDrafts'
import { TIER_PRESTIGE } from '@/components/leagues'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const championOf = (season: SeasonData) => season.teams.find((t) => t.finalPlacement === 1)?.memberId

/**
 * While a week is live it leads the page: it's what people come for on a game day, and behind the
 * Cup promo and last week's Around the Union it started a screen and a half down on a phone. It
 * reads Sleeper, not the season files, so it renders as soon as its own data is in rather than
 * waiting on the history below.
 *
 * Gate on the DATA (not just inScope): inScope flips true as soon as the tiny nfl-state fetch
 * resolves, but the per-tier season fetches take longer — and can fail. Until they're in, a
 * placeholder holds the section's height so nothing below jumps; a failure leaves no section at all.
 */
function LiveBlock({ liveWeek, onOpen }: { liveWeek: LiveWeek; onOpen: (open: OpenGame) => void }) {
  const tiers = TIER_PRESTIGE.flatMap((tier) => {
    const data = liveWeek.byTier[tier]
    return data ? [{ tier, data }] : []
  })
  if (tiers.length === 0) return liveWeek.loading ? <HomeLiveSectionPlaceholder /> : null
  const week = tiers[0]?.data.currentWeek
  // Tuesday leads with the standings instead of the matchups (see homeLiveSection) — but only once
  // a week has actually finished, otherwise there is nothing in them and the matchups stay.
  const showStandings = homeLiveSection() === 'standings' && tiers.some(({ data }) => data.currentWeek > 1)
  const freshness = { asOf: liveWeek.asOf, refreshing: liveWeek.refreshing, onRefresh: liveWeek.refresh }
  return <HomeLiveSection tiers={tiers} week={week} showStandings={showStandings} freshness={freshness} onOpen={onOpen} />
}

/** Last week's Around the Union panel — needs every season file, so it has its own loading state. */
function UnionPanel({ seasons, loading, year }: { seasons: SeasonData[]; loading: boolean; year: string | undefined }) {
  const union = useMemo(() => unionHighlight(seasons, year), [seasons, year])
  if (loading) return <LoadingSpinner label="Loading Around the Union…" />
  return <HomeUnionPanel highlight={union} />
}

/**
 * The champions views. Years that have a CHAMPION, which is not the same as years with data: the
 * season being played has a file from the day its leagues are created, but nobody wins it until the
 * playoffs are done — so counting it would head the page "2026 Champions" over three blank slots,
 * and open the Champions by Season table with an empty row. A season joins them once it has a winner.
 */
function Champions({ seasons, loading }: { seasons: SeasonData[]; loading: boolean }) {
  const { years, champions } = useMemo(() => {
    const champions = new Map<string, string>() // `${year}|${tier}` -> memberId
    const yearSet = new Set<string>()
    for (const s of seasons) {
      const id = championOf(s)
      if (!id) continue
      yearSet.add(s.year)
      champions.set(`${s.year}|${s.tier}`, id)
    }
    return { years: [...yearSet].sort().reverse(), champions }
  }, [seasons])
  const latest = years[0]
  const latestChampions: LatestChampion[] = useMemo(
    () => (latest ? tiersForYear(latest).map((tier: Tier) => ({ tier, memberId: champions.get(`${latest}|${tier}`) })) : []),
    [latest, champions],
  )

  return (
    <>
      {loading ? <LoadingSpinner label="Loading champions…" /> : latest && <LatestChampions year={latest} champions={latestChampions} />}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Champions by Season</h2>
        {loading ? <LoadingSpinner /> : <ChampionsByLeague years={years} champions={champions} />}
      </section>
    </>
  )
}

export function Overview() {
  const { data: seasons, loading, error } = useAllSeasons()
  // One nullable-unwrap for the whole page: every selector below takes the same array.
  const allSeasons = useMemo(() => seasons ?? [], [seasons])
  // Polled only when the matchups are showing: Tuesday's standings are built from finished weeks.
  const liveWeek = useLiveWeek({ poll: homeLiveSection() === 'matchups' })
  const [open, setOpen] = useState<OpenGame | null>(null)
  // The season being played, from config — not `latest + 1`, which skips past it once it has a
  // data file of its own (see upcomingYear). Config answers without the season files, so the
  // drafts panel doesn't wait on them either.
  const nextYear = upcomingYear(allSeasons)
  const { schedules: draftSchedules } = useDraftSchedules(nextYear)
  const historyFailed = error !== undefined || (!loading && !seasons)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">Fantasy Football Union</h1>
      <LiveBlock liveWeek={liveWeek} onOpen={setOpen} />
      <CupBanner />
      {historyFailed ? (
        <ErrorMessage error={error ?? 'No data'} />
      ) : (
        <UnionPanel seasons={allSeasons} loading={loading} year={nextYear} />
      )}
      <UpcomingDrafts year={nextYear} schedules={draftSchedules} />
      {!historyFailed && <Champions seasons={allSeasons} loading={loading} />}
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
