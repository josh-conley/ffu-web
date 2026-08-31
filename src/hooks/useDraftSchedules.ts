import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS } from '@/config'
import type { DraftSchedule } from '@/data'
import { fetchDraftSchedules } from '@/data'
import { usePoll } from './usePoll'

/** Slow: this only has to notice a draft starting or finishing, and it asks about all three tiers. */
const POLL_MS = 60_000

/**
 * Draft dates and status for `year`'s leagues, straight from Sleeper — the same offseason-friendly
 * shape as useLeagueRosters (zero-cost until `LIVE_LEAGUE_IDS` has an entry for that year). Tiers
 * whose date isn't set yet come back with `startTime: null`, which the caller renders as TBD.
 *
 * Polled, so a home page left open through the evening starts pointing at draft night by itself
 * rather than waiting for someone to reload. Reads through Sleeper's cache on purpose (unlike the
 * board's own polls): half a minute of staleness costs nothing in an announcement panel.
 */
export function useDraftSchedules(year: string | undefined): { schedules: DraftSchedule[]; loading: boolean } {
  const leagueIds: Partial<Record<Tier, string>> | undefined = year ? LIVE_LEAGUE_IDS[year] : undefined
  const enabled = leagueIds !== undefined

  const { data, loading } = usePoll(
    `draft-schedules:${year ?? ''}`,
    () => fetchDraftSchedules(year as string, leagueIds as Partial<Record<Tier, string>>),
    enabled,
    POLL_MS,
  )

  // Errors are swallowed on purpose (as in useLeagueRosters): Sleeper being unreachable should leave
  // the dates reading TBD, not show an error above the rest of the home page.
  return { schedules: data ?? [], loading }
}
