import { useMemo } from 'react'
import type { SeasonData } from '@/data'
import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { useSeason, useSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { regularSeasonStandings, seasonUpr, standingsByDivision } from '@/selectors'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { StandingsTable } from '@/components/StandingsTable'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

function StandingsContent({ season, year }: { season: SeasonData; year: string }) {
  const upr = useMemo(() => seasonUpr(season), [season])
  const divisions = useMemo(() => standingsByDivision(season), [season])
  const flat = useMemo(() => regularSeasonStandings(season), [season])

  if (divisions) {
    return (
      <div className="space-y-6">
        {divisions.map((group) => (
          <section key={group.division.id}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {group.division.name}
            </h2>
            <StandingsTable rows={group.rows} upr={upr} year={year} />
          </section>
        ))}
      </div>
    )
  }
  return <StandingsTable rows={flat} upr={upr} year={year} />
}

/** Inner view — mounted only once the manifest is loaded, so year/tier are always valid. */
function StandingsView({ years }: { years: string[] }) {
  const [yearParam, setYear] = useUrlState('year', years[0] ?? '')
  const year = years.includes(yearParam) ? yearParam : (years[0] ?? '')
  const tiers = tiersForYear(year)
  const [tierParam, setTier] = useUrlState('tier', 'PREMIER')
  const tier = (tiers.includes(tierParam as Tier) ? tierParam : tiers[0] ?? 'PREMIER') as Tier

  const { data: season, loading, error } = useSeason(tier, year)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Standings</h1>
        <SeasonLeaguePicker years={years} year={year} tier={tier} onYear={setYear} onTier={(t) => setTier(t)} />
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {season && <StandingsContent season={season} year={year} />}
    </div>
  )
}

export function Standings() {
  const { data: manifest, loading, error } = useSeasons()
  if (loading) return <LoadingSpinner />
  if (error || !manifest) return <ErrorMessage error={error ?? 'No seasons found'} />

  const years = [...new Set(manifest.map((s) => s.year))].sort().reverse()
  return <StandingsView years={years} />
}
