import { useMemo } from 'react'
import { PLAYOFF_FIELD } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { longestSeason, oddsFormats, oddsSample, oddsSeasonView, recordOdds, type OddsFormat } from '@/selectors'
import { PlayoffOddsTable } from '@/components/PlayoffOddsTable'
import { PlayoffOddsNotes, ShorterSeasonsNote } from '@/components/PlayoffOddsNotes'
import { yearSpan } from '@/components/format'
import { SELECT, segButton } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

/**
 * Out of season there is no "now" to open on, so the page opens where the commissioner first asked
 * the question: ten games in, four to play.
 */
const OFFSEASON_GAMES = 10

/** The URL's game count when the sample has history for it, else the live week, else the default. */
function pickGames(param: string, latestWeek: number | undefined, maxGames: number): number {
  const asked = Number(param)
  if (Number.isInteger(asked) && asked >= 1 && asked <= maxGames) return asked
  return Math.min(latestWeek ?? OFFSEASON_GAMES, maxGames)
}

/** The years the odds are drawn from: the current format's, back to the oldest pooled in. */
function sampleSpan(primary: OddsFormat, others: OddsFormat[], includeOthers: boolean): string {
  const first = includeOthers ? [primary, ...others].map((f) => f.firstYear).sort()[0]! : primary.firstYear
  return yearSpan({ firstYear: first, lastYear: primary.lastYear })
}

/**
 * Historical playoff odds by record: of the teams that were 7-3, how many made it, and where a win
 * or a loss this week leaves them. The commissioner asked for it to write about in the FFUN, so it
 * is a reference table, not a capture block.
 */
export function PlayoffOdds() {
  const { data: seasons, loading, error } = useAllSeasons()
  const [gamesParam, setGames] = useUrlState('games', '')
  const [allParam, setAll] = useUrlState('all', '')
  const includeOthers = allParam === '1'

  const { year = '', inProgress, latestWeek } = useMemo(() => oddsSeasonView(seasons ?? []), [seasons])
  const formats = useMemo(() => oddsFormats(seasons ?? []), [seasons])
  const { sample, maxGames } = useMemo(() => {
    const chosen = oddsSample(seasons ?? [], includeOthers)
    return { sample: chosen, maxGames: longestSeason(chosen) }
  }, [seasons, includeOthers])
  const games = pickGames(gamesParam, latestWeek, maxGames)
  const table = useMemo(() => recordOdds(sample, games, inProgress), [sample, games, inProgress])

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />
  const { primary, others } = formats
  if (primary === undefined) return <ErrorMessage error="No finished season to draw on yet." />

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Playoff Odds by Record</h1>
        <p className="text-sm text-muted">
          How often teams at each record made the {PLAYOFF_FIELD.teams}-team playoff field, and where a win or a loss
          next week would leave them. From the {sampleSpan(primary, others, includeOthers)} seasons.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <span className="text-muted">After</span>
            <select className={SELECT} value={String(games)} onChange={(e) => setGames(e.target.value)}>
              {Array.from({ length: maxGames }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'game' : 'games'}
                  {n === latestWeek ? ' (now)' : ''}
                </option>
              ))}
            </select>
          </label>
          {others.length > 0 && (
            <button
              type="button"
              aria-pressed={includeOthers}
              className={segButton(includeOthers)}
              onClick={() => setAll(includeOthers ? '' : '1')}
            >
              Include {others.map(yearSpan).join(', ')}
            </button>
          )}
        </div>
        {includeOthers && <ShorterSeasonsNote primary={primary} others={others} />}
      </div>

      <PlayoffOddsTable table={table} year={year} />
      <PlayoffOddsNotes table={table} year={year} />
    </div>
  )
}
