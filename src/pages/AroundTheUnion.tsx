import { useMemo } from 'react'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import {
  aroundTheUnionYear,
  completedUnionWeeks,
  leaguePointsRace,
  topScoresForWeek,
} from '@/selectors'
import { AroundTheUnionBoard } from '@/components/AroundTheUnionBoard'
import { SELECT } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

/**
 * Around the Union — the FFUN's page-2 staple, derived instead of retyped.
 *
 * Built for CAPTURE: the block below is one self-contained bordered unit an author can screenshot
 * straight into the newsletter. Everything on the page outside it is navigation, so it stays out of
 * the crop.
 *
 * Reports on completed weeks only, from the static season files — the week in progress belongs to
 * the home page's This Week section, which is live and moves under you. That also means the week
 * lands here when the Tuesday refresh Action commits it, which is the same morning the week ends.
 */
export function AroundTheUnion() {
  const { data: seasons, loading, error } = useAllSeasons()
  const [weekParam, setWeek] = useUrlState('week', '')

  const year = useMemo(() => aroundTheUnionYear(seasons ?? []), [seasons])
  const yearSeasons = useMemo(() => (seasons ?? []).filter((s) => s.year === year), [seasons, year])
  const weeks = useMemo(() => completedUnionWeeks(yearSeasons), [yearSeasons])
  // The URL wins only if it names a week we actually have; otherwise open on the latest, which is
  // what an author wants every Tuesday.
  const week = weeks.includes(Number(weekParam)) ? Number(weekParam) : weeks.at(-1)
  const scores = useMemo(() => (week === undefined ? [] : topScoresForWeek(yearSeasons, week)), [yearSeasons, week])
  const race = useMemo(() => leaguePointsRace(yearSeasons), [yearSeasons])

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Around the Union</h1>
        <p className="max-w-2xl text-sm text-muted">
          The week's biggest scores across all three leagues, and the league-by-league scoring race that decides the
          high-score payouts. Built for the FFUN — screenshot the panel below and it drops straight onto page 2.
        </p>
      </div>

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

      {year === undefined ? (
        <ErrorMessage error="No season has been played yet." />
      ) : (
        <AroundTheUnionBoard year={year} week={week} scores={scores} race={race} />
      )}
    </div>
  )
}
