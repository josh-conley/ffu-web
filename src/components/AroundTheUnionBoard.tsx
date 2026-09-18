import type { LeaguePointsRow, WeekScore } from '@/selectors'
import { LeaguePointsRace } from './LeaguePointsRace'
import { TopWeekScorers } from './TopWeekScorers'

/**
 * The screenshot target: both halves of the newsletter's "Around the Union" in one framed block,
 * stacked the way page 2 of the FFUN stacks them — the week's top scores above, the league scoring
 * race below. Kept as one bordered unit with its own titled header so a capture of just this
 * element is self-explanatory once it's pasted into the newsletter, with no site chrome around it.
 */
export function AroundTheUnionBoard({
  year,
  week,
  scores,
  race,
}: {
  year: string
  week: number | undefined
  scores: WeekScore[]
  race: LeaguePointsRow[]
}) {
  return (
    <section className="border border-border bg-surface-2/40 shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 bg-accent px-4 py-2 text-accent-fg">
        <h2 className="text-sm font-extrabold uppercase tracking-widest">Around the Union</h2>
        <span className="font-mono text-xs font-bold tabular-nums">{week ? `${year} · Week ${week}` : year}</span>
      </header>
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
    </section>
  )
}
