import { useMemo } from 'react'
import type { SeasonData } from '@/data'
import { useSeasonView } from '@/hooks/useSeasonView'
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

export function Standings() {
  const { years, year, tier, setYear, setTier, season, loading, error } = useSeasonView()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Standings</h1>
        {years.length > 0 && (
          <SeasonLeaguePicker years={years} year={year} tier={tier} onYear={setYear} onTier={setTier} />
        )}
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {season && <StandingsContent season={season} year={year} />}
    </div>
  )
}
