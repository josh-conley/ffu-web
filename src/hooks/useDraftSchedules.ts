import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS } from '@/config'
import type { DraftSchedule } from '@/data'
import { fetchDraftSchedules } from '@/data'
import { useAsyncData } from './useAsyncData'

/**
 * Draft dates for `year`'s leagues, straight from Sleeper — the same offseason-friendly shape as
 * useLeagueRosters (zero-cost until `LIVE_LEAGUE_IDS` has an entry for that year). Tiers whose date
 * isn't set yet come back with `startTime: null`, which the caller renders as TBD.
 */
export function useDraftSchedules(year: string | undefined): { schedules: DraftSchedule[]; loading: boolean } {
  const leagueIds: Partial<Record<Tier, string>> | undefined = year ? LIVE_LEAGUE_IDS[year] : undefined
  const enabled = leagueIds !== undefined

  const { data, loading } = useAsyncData(
    `draft-schedules:${year ?? ''}`,
    () => fetchDraftSchedules(year as string, leagueIds as Partial<Record<Tier, string>>),
    enabled,
  )

  // Errors are swallowed on purpose (as in useLeagueRosters): Sleeper being unreachable should leave
  // the dates reading TBD, not show an error above the rest of the home page.
  return { schedules: data ?? [], loading: enabled && loading }
}
