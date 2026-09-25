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
 */
export function useLiveProjections(seasons: LiveSeasonData[], enabled: boolean): Map<string, number> {
  const first = seasons[0]
  const nfl = useNflWeek(first?.year, first?.currentWeek, enabled)
  const lineups = useAsyncData(
    `live-week-lineups:${seasons.map((s) => `${s.leagueId}:${s.currentWeek}`).join(',')}`,
    () => Promise.all(seasons.map((s) => fetchLiveWeekLineups(s.leagueId, s.currentWeek))),
    enabled && seasons.length > 0,
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
