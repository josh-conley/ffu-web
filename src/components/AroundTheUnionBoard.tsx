import type { LeaguePointsRow, WeekScore } from '@/selectors'
import { AroundTheUnionCompact } from './AroundTheUnionCompact'
import { LeaguePointsRace } from './LeaguePointsRace'
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
}: {
  year: string
  week: number | undefined
  scores: WeekScore[]
  race: LeaguePointsRow[]
  layout: BoardLayout
}) {
  const compact = layout === 'ffun'
  return (
    <section className="border border-border bg-surface-2/40 shadow-sm">
      <header
        className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 bg-accent text-accent-fg ${compact ? 'px-3 py-1' : 'px-4 py-2'}`}
      >
        <h2 className={`font-extrabold uppercase tracking-widest ${compact ? 'text-xs' : 'text-sm'}`}>Around the Union</h2>
        <span className="font-mono text-xs font-bold tabular-nums">{week ? `${year} · Week ${week}` : year}</span>
      </header>
      {compact ? (
        <AroundTheUnionCompact year={year} scores={scores} race={race} />
      ) : (
        <StandardBody year={year} week={week} scores={scores} race={race} />
      )}
    </section>
  )
}
