import { useMemo, useState } from 'react'
import type { SeasonData } from '@/data'
import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useLiveWeek } from '@/hooks/useLiveWeek'
import { ChampionsByLeague } from '@/components/ChampionsByLeague'
import { LatestChampions, type LatestChampion } from '@/components/LatestChampions'
import { CurrentWeekMatchups, type OpenGame } from '@/components/CurrentWeekMatchups'
import { CurrentWeekStandings } from '@/components/CurrentWeekStandings'
import { LiveLineupModal } from '@/components/LiveLineupModal'
import { TIER_PRESTIGE } from '@/components/leagues'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const championOf = (season: SeasonData) => season.teams.find((t) => t.finalPlacement === 1)?.memberId

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

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">Fantasy Football Union</h1>
      {liveWeek.inScope && (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
              This Week{currentWeekNumber ? ` — Week ${currentWeekNumber}` : ''}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveTiers.map(({ tier, data }) => (
                <CurrentWeekMatchups key={tier} tier={tier} data={data} onOpen={setOpen} />
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Standings</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveTiers.map(({ tier, data }) => (
                <CurrentWeekStandings key={tier} tier={tier} data={data} />
              ))}
            </div>
          </section>
        </>
      )}
      {latest && <LatestChampions year={latest} champions={latestChampions} />}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Champions by Season</h2>
        <ChampionsByLeague years={years} champions={champions} />
      </section>
      {open && <LiveLineupModal leagueId={open.leagueId} year={open.year} game={open.game} onClose={() => setOpen(null)} />}
    </div>
  )
}
