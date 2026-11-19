import { useMemo } from 'react'
import { PLAYOFF_FIELD } from '@/config'
import type { SeasonData } from '@/data'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import {
  longestSeason,
  oddsFormats,
  oddsSample,
  oddsSeasonView,
  recordOdds,
  UPR_MIN_WEEKS,
  uprOdds,
  type OddsFormat,
} from '@/selectors'
import { PlayoffOddsControls, type OddsMode } from '@/components/playoffOdds/PlayoffOddsControls'
import { RecordOddsNotes, ShorterSeasonsNote, UprOddsNotes } from '@/components/playoffOdds/PlayoffOddsNotes'
import { RecordOddsTable } from '@/components/playoffOdds/RecordOddsTable'
import { UprOddsTable } from '@/components/playoffOdds/UprOddsTable'
import { yearSpan } from '@/components/format'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

/**
 * Out of season there is no "now" to open on, so the page opens where the commissioner first asked
 * the question: ten games in, four to play.
 */
const OFFSEASON_GAMES = 10

/** The URL's game count when it's in range, else the live week, else the default; kept in range. */
function pickGames(param: string, latestWeek: number | undefined, min: number, max: number): number {
  const asked = Number(param)
  if (Number.isInteger(asked) && asked >= min && asked <= max) return asked
  return Math.max(min, Math.min(latestWeek ?? OFFSEASON_GAMES, max))
}

/** The years the odds are drawn from: the current format's, back to the oldest pooled in. */
function sampleSpan(primary: OddsFormat, others: OddsFormat[], includeOthers: boolean): string {
  const first = includeOthers ? [primary, ...others].map((f) => f.firstYear).sort()[0]! : primary.firstYear
  return yearSpan({ firstYear: first, lastYear: primary.lastYear })
}

interface ViewProps {
  sample: SeasonData[]
  games: number
  inProgress: SeasonData[]
  year: string
}

function RecordView({ sample, games, inProgress, year }: ViewProps) {
  const table = useMemo(() => recordOdds(sample, games, inProgress), [sample, games, inProgress])
  return (
    <>
      <RecordOddsTable table={table} year={year} />
      <RecordOddsNotes table={table} year={year} />
    </>
  )
}

function UprView({ sample, games, inProgress, year }: ViewProps) {
  const table = useMemo(() => uprOdds(sample, games, inProgress), [sample, games, inProgress])
  return (
    <>
      <UprOddsTable table={table} year={year} />
      <UprOddsNotes />
    </>
  )
}

/**
 * Historical playoff odds: of the teams that were 7-3 (or rated 150–159) after N games, how many made
 * it. The commissioner asked for it to write about in the FFUN, so it is a reference table, not a
 * capture block.
 */
export function PlayoffOdds() {
  const { data: seasons, loading, error } = useAllSeasons()
  const [gamesParam, setGames] = useUrlState('games', '')
  const [allParam, setAll] = useUrlState('all', '')
  const [modeParam, setMode] = useUrlState('by', 'record')
  const mode: OddsMode = modeParam === 'upr' ? 'upr' : 'record'
  const includeOthers = allParam === '1'

  const { year = '', inProgress, latestWeek } = useMemo(() => oddsSeasonView(seasons ?? []), [seasons])
  const formats = useMemo(() => oddsFormats(seasons ?? []), [seasons])
  const { sample, maxGames } = useMemo(() => {
    const chosen = oddsSample(seasons ?? [], includeOthers)
    return { sample: chosen, maxGames: longestSeason(chosen) }
  }, [seasons, includeOthers])
  // UPR doesn't exist until its minimum weeks are in.
  const minGames = mode === 'upr' ? UPR_MIN_WEEKS : 1
  const games = pickGames(gamesParam, latestWeek, minGames, maxGames)

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />
  const { primary, others } = formats
  if (primary === undefined) return <ErrorMessage error="No finished season to draw on yet." />
  const view = { sample, games, inProgress, year }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Playoff Odds</h1>
        <p className="text-sm text-muted">
          {mode === 'upr'
            ? `How often teams in each UPR range made the ${PLAYOFF_FIELD.teams}-team playoff field.`
            : `How often teams at each record made the ${PLAYOFF_FIELD.teams}-team playoff field, and where a win or a loss next week would leave them.`}{' '}
          From the {sampleSpan(primary, others, includeOthers)} seasons.
        </p>
      </div>

      <div className="space-y-2">
        <PlayoffOddsControls
          mode={mode}
          onMode={setMode}
          games={games}
          onGames={(n) => setGames(String(n))}
          minGames={minGames}
          maxGames={maxGames}
          latestWeek={latestWeek}
          others={others}
          includeOthers={includeOthers}
          onIncludeOthers={(on) => setAll(on ? '1' : '')}
        />
        {includeOthers && <ShorterSeasonsNote primary={primary} others={others} />}
      </div>

      {mode === 'upr' ? <UprView {...view} /> : <RecordView {...view} />}
    </div>
  )
}
