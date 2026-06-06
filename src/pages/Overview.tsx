import { useMemo } from 'react'
import type { SeasonData } from '@/data'
import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { ChampionsMatrix } from '@/components/ChampionsMatrix'
import { LatestChampions, type LatestChampion } from '@/components/LatestChampions'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const championOf = (season: SeasonData) => season.teams.find((t) => t.finalPlacement === 1)?.memberId

export function Overview() {
  const { data: seasons, loading, error } = useAllSeasons()
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

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Fantasy Football Union</h1>
        <p className="mt-1 text-muted">{years.length} seasons · champions by tier</p>
      </div>
      {latest && <LatestChampions year={latest} champions={latestChampions} />}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Champions by Season</h2>
        <ChampionsMatrix years={years} champions={champions} />
      </section>
    </div>
  )
}
