import { useMemo, useState } from 'react'
import type { Game, SeasonData } from '@/data'
import { useSeasonView } from '@/hooks/useSeasonView'
import { gamesByWeek } from '@/selectors'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { MatchupCard } from '@/components/MatchupCard'
import { LineupModal } from '@/components/LineupModal'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

function MatchupsContent({ season, year }: { season: SeasonData; year: string }) {
  const weeks = useMemo(() => gamesByWeek(season), [season])
  const [open, setOpen] = useState<Game | null>(null)
  // Lineups exist only for the Sleeper era; ESPN-era cards stay non-clickable.
  const hasLineups = season.era === 'sleeper'
  return (
    <div className="space-y-8">
      {weeks.map(({ week, games }) => (
        <section key={week}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-text">
            <span className="inline-block h-4 w-1 bg-accent" aria-hidden />
            Week {week}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {games.map((game, i) => (
              <MatchupCard key={`${week}-${i}`} game={game} year={year} onOpen={hasLineups ? () => setOpen(game) : undefined} />
            ))}
          </div>
        </section>
      ))}
      {open && <LineupModal tier={season.tier} year={year} game={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

export function Matchups() {
  const { years, year, tier, setYear, setTier, season, loading, error } = useSeasonView()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Matchups</h1>
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
