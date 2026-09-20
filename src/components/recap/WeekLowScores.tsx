import type { WeekScore } from '@/selectors'
import { RecapPanel } from './RecapPanel'
import { WeekScoreChip, WeekScoreRow } from './WeekScoreRow'

/**
 * The other end of the week: the three lowest scores in the Union.
 *
 * Deliberately the same shape as the top-scores block rather than a softened version of it — the
 * league has always published both, and a recap that only prints the winners isn't the FFUN. The
 * ranks count from the top of the field (36th, 35th, 34th), so the block can't be misread as a
 * podium.
 */
export function WeekLowScores({
  scores,
  year,
  week,
  compact,
  copyFilename,
}: {
  scores: WeekScore[]
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  return (
    <RecapPanel
      title="Lowest Scores"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      {scores.length === 0 ? (
        <p className="p-4 text-sm text-muted">No completed week to report yet.</p>
      ) : compact ? (
        // gap-px over the border color draws the hairlines between rows without stacking borders.
        // Stacked, not three across: a team name and its score need the width, and three columns
        // of truncated names is the one thing a printed recap cannot afford.
        <div className="flex flex-col gap-px bg-border">
          {scores.map((score) => (
            <WeekScoreChip key={`${score.tier}-${score.memberId}`} score={score} year={year} />
          ))}
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {scores.map((score) => (
            <WeekScoreRow key={`${score.tier}-${score.memberId}`} score={score} year={year} />
          ))}
        </div>
      )}
    </RecapPanel>
  )
}
