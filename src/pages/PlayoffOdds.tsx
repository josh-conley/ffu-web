import { useMemo } from 'react'
import { PLAYOFF_FIELD } from '@/config'
import type { SeasonData } from '@/data'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { oddsSeasonView, playoffOddsByRecord, type OddsSeasonView } from '@/selectors'
import { PlayoffOddsTable } from '@/components/PlayoffOddsTable'
import { SELECT } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

/**
 * Out of season there is no "now" to open on, so the page opens where the commissioner first asked
 * the question: ten games in, four to play.
 */
const OFFSEASON_GAMES = 10

/** The URL's game count when it is one we have history for, else the live week, else the default. */
function pickGames(param: string, view: OddsSeasonView): number {
  const asked = Number(param)
  if (Number.isInteger(asked) && asked >= 1 && asked <= view.maxGames) return asked
  return Math.min(view.latestWeek ?? OFFSEASON_GAMES, view.maxGames)
}

/** Where a table's game count sits against the live season: what it has played, or the week next. */
function metaFor(games: number, view: OddsSeasonView): string | undefined {
  if (view.year === undefined || view.latestWeek === undefined) return undefined
  if (games <= view.latestWeek) return `${view.year} · after Week ${games}`
  return games === view.latestWeek + 1 ? `${view.year} · next week` : undefined
}

function Tables({ seasons, view, games }: { seasons: SeasonData[]; view: OddsSeasonView; games: number }) {
  // This game count, and the next one: where the teams are, and where they could be after this week.
  const { inProgress, maxGames } = view
  const tables = useMemo(() => {
    const counts = games < maxGames ? [games, games + 1] : [games]
    return counts.map((n) => playoffOddsByRecord(seasons, n, inProgress))
  }, [seasons, inProgress, maxGames, games])
  return (
    <div className="space-y-8">
      {tables.map((table) => (
        <PlayoffOddsTable
          key={table.games}
          table={table}
          year={view.year ?? ''}
          title={`Playoff Odds After ${table.games} Games`}
          meta={metaFor(table.games, view)}
        />
      ))}
    </div>
  )
}

/**
 * Historical playoff odds by record: of the teams that were 7-3, how many made it. The commissioner
 * asked for it to write about in the FFUN, so it is a reference table, not a capture block.
 */
export function PlayoffOdds() {
  const { data: seasons, loading, error } = useAllSeasons()
  const [gamesParam, setGames] = useUrlState('games', '')
  const view = useMemo(() => oddsSeasonView(seasons ?? []), [seasons])
  const games = pickGames(gamesParam, view)

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />
  if (view.maxGames === 0) return <ErrorMessage error="No finished season to draw on yet." />

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Playoff Odds by Record</h1>
        <p className="text-sm text-muted">
          How often teams at each record went on to make the {PLAYOFF_FIELD.teams}-team playoff field. Each
          season length also gets its own column, with the games those seasons had left at that point.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <span className="text-muted">After</span>
        <select className={SELECT} value={String(games)} onChange={(e) => setGames(e.target.value)}>
          {Array.from({ length: view.maxGames }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'game' : 'games'}
              {n === view.latestWeek ? ' (now)' : ''}
            </option>
          ))}
        </select>
      </label>
      <Tables seasons={seasons} view={view} games={games} />
    </div>
  )
}
