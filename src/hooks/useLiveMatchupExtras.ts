import { useMemo } from 'react'
import type { LiveSeasonData, SeasonData } from '@/data'
import { regularSeasonTotals, seasonUpr, type TeamTotals } from '@/selectors'
import { useLiveProjections } from './useLiveProjections'

export interface LiveMatchupExtras {
  /** Record and average through the weeks in the season file (every completed week). */
  totals: Map<string, TeamTotals>
  /** Empty until the season has earned a UPR (see `seasonUpr`). */
  upr: Map<string, number>
  /** Projected final scores for the live week; empty when no week is live. */
  projections: Map<string, number>
}

/**
 * What the Matchups page's live-week cards show besides the score, from the same sources as the
 * home page's This Week: the season's totals and UPR, and `useLiveProjections` for the week being
 * played. The projections hook only reads a league's id and week, so the season file stands in for
 * the live data the home page has.
 */
export function useLiveMatchupExtras(season: SeasonData, liveWeek: number | undefined): LiveMatchupExtras {
  const totals = useMemo(() => regularSeasonTotals(season), [season])
  const upr = useMemo(() => seasonUpr(season), [season])
  const live = useMemo<LiveSeasonData[]>(
    () =>
      liveWeek === undefined || season.era !== 'sleeper'
        ? []
        : [{ tier: season.tier, year: season.year, leagueId: season.platformLeagueId, currentWeek: liveWeek, memberIds: [], games: [] }],
    [season, liveWeek],
  )
  const projections = useLiveProjections(live, live.length > 0, undefined)
  return { totals, upr, projections }
}
