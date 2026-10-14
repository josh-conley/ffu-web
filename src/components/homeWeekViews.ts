import { CUP_NAME } from '@/config'
import type { ResolvedRound } from '@/selectors'

// The views the home page's matchups can switch between: the league week on show (and, on Tuesday,
// the week just finished beside the one starting), plus any Cup round played in one of those weeks.
// Ids are kept stable ('final', 'current', 'cup-<round key>') because the choice lives in the URL.

interface ViewBase {
  id: string
  label: string
  week: number
  /** The week is over (Tuesday's finals). */
  final: boolean
}

export type HomeWeekView = (ViewBase & { kind: 'league' }) | (ViewBase & { kind: 'cup'; round: ResolvedRound })

/** In week order, each league week followed by its Cup round, if one is played that week. */
export function homeWeekViews(currentWeek: number, finished: number | undefined, cupRounds: readonly ResolvedRound[]): HomeWeekView[] {
  const weeks = finished === undefined ? [{ id: 'current', week: currentWeek, final: false }] : [
    { id: 'final', week: finished, final: true },
    { id: 'current', week: currentWeek, final: false },
  ]
  return weeks.flatMap(({ id, week, final }): HomeWeekView[] => {
    const suffix = final ? ' · Final' : ''
    const cup = cupRounds
      .filter((r) => r.week === week)
      .map((round): HomeWeekView => ({ kind: 'cup', id: `cup-${round.key}`, label: `${CUP_NAME} · ${round.label}${suffix}`, week, final, round }))
    return [{ kind: 'league', id, label: `Week ${week}${suffix}`, week, final }, ...cup]
  })
}
