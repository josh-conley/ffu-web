import { useMemo } from 'react'
import type { PlayerMap, SeasonData, SeasonLineups } from '@/data'
import { useAllSeasons, usePlayers, useYearLineups } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import {
  activeStreaks,
  aroundTheUnionYear,
  benchRegrets,
  bottomScoresForWeek,
  completedUnionWeeks,
  leaguePointsRace,
  longestStreaks,
  playersOfWeek,
  topScoresForWeek,
  weekMovers,
  weekNotes,
} from '@/selectors'
import { AroundTheUnionBoard, type BoardLayout } from '@/components/AroundTheUnionBoard'
import { WeekLowScores } from '@/components/recap/WeekLowScores'
import { WeekMovers } from '@/components/recap/WeekMovers'
import { WeekBenchRegrets, WeekPlayerHighs } from '@/components/recap/WeekPlayers'
import { WeekStories } from '@/components/recap/WeekStories'
import { WeekStreaks } from '@/components/recap/WeekStreaks'
import { SELECT, segButton } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

/** Label per layout — "FFUN" is the condensed one, named after where it ends up. */
const LAYOUTS: [BoardLayout, string][] = [
  ['standard', 'Standard'],
  ['ffun', 'FFUN'],
]

/**
 * The player blocks, which need the week's lineups and the player reference — files the rest of the
 * page doesn't load. They render nothing at all until both arrive, rather than flashing an empty
 * block: a season without lineups on file simply has no player half to its recap.
 */
function PlayerBlocks({
  lineups,
  players,
  year,
  week,
  compact,
  capture,
}: {
  lineups: SeasonLineups[] | undefined
  players: PlayerMap | undefined
  year: string
  week: number | undefined
  compact: boolean
  capture: (block: string) => string | undefined
}) {
  const highs = useMemo(
    () => (lineups === undefined || players === undefined || week === undefined ? [] : playersOfWeek(lineups, players, week)),
    [lineups, players, week],
  )
  const regrets = useMemo(
    () => (lineups === undefined || players === undefined || week === undefined ? [] : benchRegrets(lineups, players, week)),
    [lineups, players, week],
  )
  if (highs.length === 0 && regrets.length === 0) return null
  const common = { year, week, compact }
  return (
    <>
      <WeekPlayerHighs {...common} players={highs} copyFilename={capture('players-of-the-week')} />
      <WeekBenchRegrets {...common} regrets={regrets} copyFilename={capture('left-on-the-bench')} />
    </>
  )
}

/**
 * The week's blocks, in the order the newsletter reads them: the anchor panel, then the scores,
 * then form, then the players.
 *
 * Every block is derived here and presented there — the components take rows and know nothing
 * about seasons. Only the FFUN layout gets file names, and a file name is what makes a block
 * copyable (see RecapPanel); the standard layout is the reading view.
 */
function WeekBlocks({
  yearSeasons,
  year,
  week,
  layout,
}: {
  yearSeasons: SeasonData[]
  year: string
  week: number | undefined
  layout: BoardLayout
}) {
  const compact = layout === 'ffun'
  const { data: lineups } = useYearLineups(year)
  const { data: players } = usePlayers()
  const scores = useMemo(() => (week === undefined ? [] : topScoresForWeek(yearSeasons, week)), [yearSeasons, week])
  const lows = useMemo(() => (week === undefined ? [] : bottomScoresForWeek(yearSeasons, week)), [yearSeasons, week])
  const notes = useMemo(() => weekNotes(yearSeasons, week ?? 0), [yearSeasons, week])
  const race = useMemo(() => leaguePointsRace(yearSeasons), [yearSeasons])
  const streaks = useMemo(() => activeStreaks(yearSeasons, week ?? 0), [yearSeasons, week])
  const movers = useMemo(() => weekMovers(yearSeasons, week ?? 0), [yearSeasons, week])

  // One file name per block, so a folder of downloads says which is which.
  const capture = (block: string) => (compact ? `ffu-${block}-${year}-week-${week ?? ''}.png` : undefined)
  const common = { year, week, compact }

  return (
    <div className="space-y-8">
      <AroundTheUnionBoard
        year={year}
        week={week}
        scores={scores}
        race={race}
        layout={layout}
        copyFilename={capture('around-the-union')}
      />
      <WeekLowScores {...common} scores={lows} copyFilename={capture('bottom-of-the-barrel')} />
      <WeekStories {...common} notes={notes} copyFilename={capture('week-in-review')} />
      <WeekStreaks
        {...common}
        hot={longestStreaks(streaks, 'W')}
        cold={longestStreaks(streaks, 'L')}
        copyFilename={capture('hot-and-cold')}
      />
      <WeekMovers
        {...common}
        risers={movers.filter((m) => m.delta > 0).slice(0, 3)}
        fallers={movers.filter((m) => m.delta < 0).slice(-3).reverse()}
        copyFilename={capture('risers-and-fallers')}
      />
      <PlayerBlocks lineups={lineups} players={players} year={year} week={week} compact={compact} capture={capture} />
    </div>
  )
}

/**
 * Around the Union — the FFUN's page-2 staple, derived instead of retyped.
 *
 * Built for CAPTURE: each block below is a self-contained bordered unit with its own copy button,
 * so an author takes the two or three that fit that week's room in the newsletter. Everything
 * outside the blocks is a control, and stays out of the crop.
 *
 * Reports on completed weeks only, from the static season files — the week in progress belongs to
 * the home page's This Week section, which is live and moves under you. That also means the week
 * lands here when the Tuesday refresh Action commits it, which is the same morning the week ends.
 */
export function AroundTheUnion() {
  const { data: seasons, loading, error } = useAllSeasons()
  const [weekParam, setWeek] = useUrlState('week', '')
  // In the URL so the commissioner can bookmark the layout he actually screenshots.
  const [layoutParam, setLayout] = useUrlState('layout', 'standard')
  const layout: BoardLayout = layoutParam === 'ffun' ? 'ffun' : 'standard'

  const year = useMemo(() => aroundTheUnionYear(seasons ?? []), [seasons])
  const yearSeasons = useMemo(() => (seasons ?? []).filter((s) => s.year === year), [seasons, year])
  const weeks = useMemo(() => completedUnionWeeks(yearSeasons), [yearSeasons])
  // The URL wins only if it names a week we actually have; otherwise open on the latest, which is
  // what an author wants every Tuesday.
  const week = weeks.includes(Number(weekParam)) ? Number(weekParam) : weeks.at(-1)

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">Around the Union</h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {weeks.length > 1 && (
          <label className="flex items-center gap-2 text-sm font-medium">
            <span className="text-muted">Week</span>
            <select className={SELECT} value={String(week ?? '')} onChange={(e) => setWeek(e.target.value)}>
              {[...weeks].reverse().map((w) => (
                <option key={w} value={w}>
                  Week {w}
                  {w === weeks.at(-1) ? ' (latest)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted">Layout</span>
          <div className="flex" role="group" aria-label="Panel layout">
            {LAYOUTS.map(([value, label]) => (
              <button key={value} type="button" className={segButton(layout === value)} onClick={() => setLayout(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {year === undefined ? (
        <ErrorMessage error="No season has been played yet." />
      ) : (
        <WeekBlocks yearSeasons={yearSeasons} year={year} week={week} layout={layout} />
      )}
    </div>
  )
}
