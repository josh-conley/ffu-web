import { useMemo } from 'react'
import type { SeasonData } from '@/data'
import { useSeasonView } from '@/hooks/useSeasonView'
import { gamesByWeek } from '@/selectors'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { MatchupCard } from '@/components/MatchupCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

function MatchupsContent({ season, year }: { season: SeasonData; year: string }) {
  const weeks = useMemo(() => gamesByWeek(season), [season])
  return (
    <div className="space-y-8">
      {weeks.map(({ week, games }) => (
        <section key={week}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Week {week}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {games.map((game, i) => (
              <MatchupCard key={`${week}-${i}`} game={game} year={year} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function Matchups() {
  const { years, year, tier, setYear, setTier, season, loading, error } = useSeasonView()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Matchups</h1>
        {years.length > 0 && (
          <SeasonLeaguePicker years={years} year={year} tier={tier} onYear={setYear} onTier={setTier} />
        )}
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {season && <MatchupsContent season={season} year={year} />}
    </div>
  )
}
