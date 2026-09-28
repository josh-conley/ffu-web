import { useMemo } from 'react'
import type { LiveSeasonData } from '@/data'
import { fetchLiveWeekLineups } from '@/data'
import { projectionsByMember } from '@/selectors'
import { useAsyncData } from './useAsyncData'
import { useNflWeek } from './useNflWeek'

/**
 * Projected final scores for this week's matchups across the given leagues, keyed by member (each
 * member plays in exactly one league a season, so one map covers them all). Empty until both the
 * lineups and the NFL week have loaded — or for good if the NFL feed fails; the cards just show
 * their actual scores.
 *
 * `asOf` is when the scores beside them were read: each new read re-reads the lineups (whose
 * `/matchups` request sleeperApi answers from that same read) and the NFL clocks, so a projection
 * never sits below a score that has moved on. The previous projections stay up meanwhile.
 */
export function useLiveProjections(seasons: LiveSeasonData[], enabled: boolean, asOf: number | undefined): Map<string, number> {
  const first = seasons[0]
  const nfl = useNflWeek(first?.year, first?.currentWeek, enabled, asOf)
  const lineups = useAsyncData(
    `live-week-lineups:${seasons.map((s) => `${s.leagueId}:${s.currentWeek}`).join(',')}:${asOf ?? ''}`,
    () => Promise.all(seasons.map((s) => fetchLiveWeekLineups(s.leagueId, s.currentWeek))),
    enabled && seasons.length > 0,
    { keepPrevious: true },
  )

  return useMemo(() => {
    const out = new Map<string, number>()
    if (!nfl || !lineups.data) return out
    for (const league of lineups.data) {
      for (const [memberId, projected] of projectionsByMember(league.teams, { ...nfl, scoring: league.scoring })) out.set(memberId, projected)
    }
    return out
  }, [nfl, lineups.data])
}
