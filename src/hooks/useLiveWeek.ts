import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS, regularSeasonWeeks } from '@/config'
import { useMemo } from 'react'
import type { Game, LiveSeasonData } from '@/data'
import { fetchLiveSeason, fetchLiveWeeksGames, type NflState } from '@/data'
import { seasonHasStarted, withCurrentWeekGames } from '@/selectors'
import { useAsyncData } from './useAsyncData'
import { usePoll } from './usePoll'
import { LIVE_SEASON_CONFIGURED, useNflState } from './useNflState'

export interface LiveWeek {
  /** True once there's an in-progress regular-season week AND a configured league id for it. */
  inScope: boolean
  byTier: Partial<Record<Tier, LiveSeasonData>>
  loading: boolean
  error: Error | undefined
  /** When the week in progress was last read (epoch ms, as that read finished); undefined until then
   *  and whenever it isn't being polled. The projections re-read on each change. */
  asOf: number | undefined
}

/** Sleeper's CDN holds `/matchups` for 60s (`s-maxage=60`), so polling any faster gains nothing. */
const POLL_MS = 60_000

const MAX_REGULAR_WEEK = regularSeasonWeeks('sleeper').length // 14 — playoffs are out of scope here

function tiersInScope(state: NflState | undefined): { tiers: Tier[]; leagueIds?: Record<Tier, string> } {
  const leagueIds = state ? LIVE_LEAGUE_IDS[state.year] : undefined
  if (!leagueIds || state?.seasonType !== 'regular' || state.week > MAX_REGULAR_WEEK) return { tiers: [] }
  // Kickoff hasn't happened yet: there is nothing to show but zeroes (see seasonHasStarted).
  if (!seasonHasStarted(state)) return { tiers: [] }
  return { tiers: Object.keys(leagueIds) as Tier[], leagueIds }
}

async function fetchAllTiers(tiers: Tier[], leagueIds: Record<Tier, string>, year: string, week: number) {
  const entries = await Promise.all(
    tiers.map(async (tier): Promise<[Tier, LiveSeasonData]> => [tier, await fetchLiveSeason(tier, year, leagueIds[tier], week)]),
  )
  return Object.fromEntries(entries) as Partial<Record<Tier, LiveSeasonData>>
}

interface CurrentWeekRead {
  games: Partial<Record<Tier, Game[]>>
  asOf: number
}

/** The week in progress only: one request per league, the roster map being kept for the visit. */
async function fetchCurrentWeek(tiers: Tier[], leagueIds: Record<Tier, string>, week: number): Promise<CurrentWeekRead> {
  const entries = await Promise.all(tiers.map(async (tier) => [tier, await fetchLiveWeeksGames(leagueIds[tier], [week])] as const))
  return { games: Object.fromEntries(entries), asOf: Date.now() }
}

/**
 * Live "current week" data for the home page's This Week section. The season so far (rosters and
 * every week) is read once per mount; while `poll` is on, the week in progress is then re-read every
 * minute (see ai-docs/DECISIONS.md, 2026-09-25), pausing in a hidden tab. Resolves to
 * `inScope: false` (and renders nothing upstream) whenever `LIVE_LEAGUE_IDS` has no entry for
 * whatever year Sleeper currently reports.
 */
export function useLiveWeek({ poll }: { poll: boolean }): LiveWeek {
  const state = useNflState()
  const { tiers, leagueIds } = tiersInScope(state.data)
  const inScope = tiers.length > 0
  const { year, week } = state.data ?? {}

  const seasons = useAsyncData(
    `live-season:${year ?? ''}:${week ?? ''}`,
    () => fetchAllTiers(tiers, leagueIds as Record<Tier, string>, year as string, week as number),
    inScope,
  )
  // Its first read coincides with the season read above, and sleeperApi answers both from one request.
  const current = usePoll(
    `live-current-week:${year ?? ''}:${week ?? ''}`,
    () => fetchCurrentWeek(tiers, leagueIds as Record<Tier, string>, week as number),
    inScope && poll,
    POLL_MS,
  )

  const byTier = useMemo(() => {
    const out: Partial<Record<Tier, LiveSeasonData>> = {}
    for (const [tier, data] of Object.entries(seasons.data ?? {}) as [Tier, LiveSeasonData][]) out[tier] = withCurrentWeekGames(data, current.data?.games[tier])
    return out
  }, [seasons.data, current.data])

  return {
    inScope,
    byTier,
    // useAsyncData reports loading=true while disabled, so gate on the configured flag too.
    loading: LIVE_SEASON_CONFIGURED && (state.loading || (inScope && seasons.loading)),
    error: state.error ?? seasons.error,
    asOf: current.data?.asOf,
  }
}
