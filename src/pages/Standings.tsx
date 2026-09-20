import { useMemo } from 'react'
import type { SeasonData } from '@/data'
import { useYearSeasons } from '@/hooks/useLeagueData'
import { useSeasonView } from '@/hooks/useSeasonView'
import { useUrlState } from '@/hooks/useUrlState'
import { finalStandings, rankedByUpr, seasonUpr, standingsByDivision, unionStandings } from '@/selectors'
import { segButton } from '@/components/controls'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { StandingsTable } from '@/components/StandingsTable'
import { UnionStandingsTable } from '@/components/UnionStandingsTable'
import { UprNote } from '@/components/UprNote'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

function StandingsContent({ season, year }: { season: SeasonData; year: string }) {
  const upr = useMemo(() => seasonUpr(season), [season])
  const divisions = useMemo(() => standingsByDivision(season), [season])
  const flat = useMemo(() => finalStandings(season), [season])
  const [view, setView] = useUrlState('view', 'division')

  if (divisions) {
    const showDivisions = view !== 'overall'
    return (
      <div className="space-y-6">
        <div className="flex gap-1">
          <button type="button" onClick={() => setView('division')} aria-pressed={showDivisions} className={segButton(showDivisions)}>
            By Division
          </button>
          <button type="button" onClick={() => setView('overall')} aria-pressed={!showDivisions} className={segButton(!showDivisions)}>
            Overall
          </button>
        </div>
        {upr.size === 0 && <UprNote />}
        {showDivisions ? (
          divisions.map((group) => (
            <section key={group.division.id}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-text">
                <span className="inline-block h-4 w-1 bg-accent" aria-hidden />
                {group.division.name}
              </h2>
              <StandingsTable rows={group.rows} upr={upr} year={year} />
            </section>
          ))
        ) : (
          <StandingsTable rows={flat} upr={upr} year={year} />
        )}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {upr.size === 0 && <UprNote />}
      <StandingsTable rows={flat} upr={upr} year={year} />
    </div>
  )
}

/**
 * The whole Union in one table (see `unionStandings`). Divisions don't appear here: they belong to
 * a single league, and this view is explicitly the one that ignores league lines.
 */
function UnionContent({ seasons, year }: { seasons: SeasonData[]; year: string }) {
  const rows = useMemo(() => unionStandings(seasons), [seasons])
  const byUpr = rankedByUpr(rows)
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        All {rows.length} teams,{' '}
        {byUpr
          ? 'ranked by UPR — the rating that compares across leagues'
          : 'ranked by where they sit in their own league, then points for'}
        . Sort any column to re-rank.
      </p>
      {!byUpr && <UprNote />}
      <UnionStandingsTable rows={rows} year={year} />
    </div>
  )
}

export function Standings() {
  const { years, year, tier, setYear, setTier, season, loading, error } = useSeasonView()
  // The scope lives in the URL beside year/tier so a Union table can be linked to directly.
  const [scope, setScope] = useUrlState('scope', 'league')
  const union = scope === 'union'
  const unionSeasons = useYearSeasons(year, union)

  const busy = union ? unionSeasons.loading : loading
  const failure = union ? unionSeasons.error : error

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Standings</h1>
        {years.length > 0 && (
          <SeasonLeaguePicker
            years={years}
            year={year}
            tier={tier}
            onYear={setYear}
            // Picking a league leaves the Union view — the two are one choice, not two.
            onTier={(t) => {
              setTier(t)
              setScope('league')
            }}
            union={{ active: union, onSelect: () => setScope('union') }}
          />
        )}
      </div>
      {busy && <LoadingSpinner />}
      {failure && <ErrorMessage error={failure} />}
      {union
        ? unionSeasons.data && <UnionContent seasons={unionSeasons.data} year={year} />
        : season && <StandingsContent season={season} year={year} />}
    </div>
  )
}
