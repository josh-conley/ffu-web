import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS } from '@/config'
import type { LeagueRosterSummary } from '@/data'
import { fetchLeagueRosters } from '@/data'
import { useAsyncData } from './useAsyncData'

/**
 * Signups for `year`'s leagues, straight from Sleeper — available in the offseason (pre-draft),
 * unlike useLiveWeek which needs an in-progress scoring week. Zero-cost until `LIVE_LEAGUE_IDS`
 * has an entry for that year: with no ids there is nothing to fetch and callers fall back.
 */
export function useLeagueRosters(year: string | undefined): { rosters: LeagueRosterSummary[]; loading: boolean } {
  const leagueIds: Partial<Record<Tier, string>> | undefined = year ? LIVE_LEAGUE_IDS[year] : undefined
  const enabled = leagueIds !== undefined

  const { data, loading } = useAsyncData(
    `league-rosters:${year ?? ''}`,
    () => fetchLeagueRosters(year as string, leagueIds as Partial<Record<Tier, string>>),
    enabled,
  )

  // Errors are swallowed on purpose: Sleeper being unreachable should quietly drop callers back to
  // what the static data knows, not show an error above the rest of the page.
  return { rosters: data ?? [], loading: enabled && loading }
}
