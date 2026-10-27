import { useMemo } from 'react'
import type { SeasonData, Tournament } from '@/data'
import { completedUnionWeeks, liveBracket, type ResolvedTournament } from '@/selectors'
import { useLiveWeek } from './useLiveWeek'

/**
 * The Cup page's bracket: the live one (see liveBracket) while the Cup's season is being played,
 * re-read with the home page's live scores, otherwise the season files' (`resolved`). Polls only
 * until there's a champion.
 */
export function useLiveCupBracket(
  tournament: Tournament | undefined,
  resolved: ResolvedTournament | undefined,
  tierSeasons: SeasonData[],
): ResolvedTournament | undefined {
  const liveWeek = useLiveWeek({ poll: resolved !== undefined && resolved.champion === undefined })
  const lastWeekOnFile = useMemo(() => completedUnionWeeks(tierSeasons).at(-1) ?? 0, [tierSeasons])
  const live = useMemo(
    () => (tournament ? liveBracket(tournament, Object.values(liveWeek.byTier), lastWeekOnFile) : undefined),
    [tournament, liveWeek.byTier, lastWeekOnFile],
  )
  return live ?? resolved
}
