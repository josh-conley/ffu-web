import { useMemo } from 'react'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import {
  aroundTheUnionYear,
  bottomScoresForWeek,
  completedUnionWeeks,
  leaguePointsRace,
  topScoresForWeek,
  weekNotes,
} from '@/selectors'
import { AroundTheUnionBoard, type BoardLayout } from '@/components/AroundTheUnionBoard'
import { WeekLowScores } from '@/components/recap/WeekLowScores'
import { WeekStories } from '@/components/recap/WeekStories'
import { SELECT, segButton } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

/** Label per layout — "FFUN" is the condensed one, named after where it ends up. */
const LAYOUTS: [BoardLayout, string][] = [
  ['standard', 'Standard'],
  ['ffun', 'FFUN'],
]

/**
 * Around the Union — the FFUN's page-2 staple, derived instead of retyped.
 *
 * Built for CAPTURE: the block below is one self-contained bordered unit an author can screenshot
 * straight into the newsletter. Everything on the page outside it is a control, so it stays out of
 * the crop. The FFUN layout condenses it to the newsletter's own horizontal bands, for the short
 * slot it has to fit on page 2.
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
  const scores = useMemo(() => (week === undefined ? [] : topScoresForWeek(yearSeasons, week)), [yearSeasons, week])
  const lows = useMemo(() => (week === undefined ? [] : bottomScoresForWeek(yearSeasons, week)), [yearSeasons, week])
  const notes = useMemo(() => weekNotes(yearSeasons, week ?? 0), [yearSeasons, week])
  const race = useMemo(() => leaguePointsRace(yearSeasons), [yearSeasons])
  // Only the FFUN layout is copied — the standard one is the reading view. One file name per block,
  // so a folder of downloads says which is which.
  const capture = (block: string) =>
    layout === 'ffun' ? `ffu-${block}-${year ?? 'season'}-week-${week ?? ''}.png` : undefined

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
        <div className="space-y-8">
          <AroundTheUnionBoard
            year={year}
            week={week}
            scores={scores}
            race={race}
            layout={layout}
            copyFilename={capture('around-the-union')}
          />
          <WeekLowScores
            scores={lows}
            year={year}
            week={week}
            compact={layout === 'ffun'}
            copyFilename={capture('bottom-of-the-barrel')}
          />
          <WeekStories
            notes={notes}
            year={year}
            week={week}
            compact={layout === 'ffun'}
            copyFilename={capture('week-in-review')}
          />
        </div>
      )}
    </div>
  )
}
