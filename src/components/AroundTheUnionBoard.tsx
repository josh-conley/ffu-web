import type { LeaguePointsRow, WeekScore } from '@/selectors'
import { AroundTheUnionCompact } from './AroundTheUnionCompact'
import { LeaguePointsRace } from './LeaguePointsRace'
import { RecapPanel } from './recap/RecapPanel'
import { TopWeekScorers } from './TopWeekScorers'

/**
 * The screenshot target: both halves of the newsletter's "Around the Union" in one framed block,
 * with its own titled header so a capture of just this element explains itself once it is pasted
 * into the FFUN, with no site chrome around it.
 *
 * Two layouts, same numbers. `standard` is the readable web view. `ffun` folds it into horizontal
 * bands modelled on the newsletter's own page-2 panel — roughly a third of the height, because the
 * slot it has to fit in is short and vertical space is what runs out there first.
 */
export type BoardLayout = 'standard' | 'ffun'

function StandardBody({ year, week, scores, race }: { year: string; week: number | undefined; scores: WeekScore[]; race: LeaguePointsRow[] }) {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          {week ? `Week ${week} — Top Scores` : 'Top Scores'}
        </h3>
        <TopWeekScorers scores={scores} year={year} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">League Scoring — Season to Date</h3>
        <LeaguePointsRace rows={race} />
      </div>
    </div>
  )
}

export function AroundTheUnionBoard({
  year,
  week,
  scores,
  race,
  layout,
  copyFilename,
}: {
  year: string
  week: number | undefined
  scores: WeekScore[]
  race: LeaguePointsRow[]
  layout: BoardLayout
  /** Set on the author's page, where the block is copied; absent on the home page's read-only copy. */
  copyFilename?: string
}) {
  const compact = layout === 'ffun'
  return (
    <RecapPanel
      title="Around the Union"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      {compact ? (
        <AroundTheUnionCompact year={year} scores={scores} race={race} />
      ) : (
        <StandardBody year={year} week={week} scores={scores} race={race} />
      )}
    </RecapPanel>
  )
}
