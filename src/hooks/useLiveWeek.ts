import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS, regularSeasonWeeks } from '@/config'
import type { LiveSeasonData } from '@/data'
import { fetchLiveSeason, fetchNflState, type NflState } from '@/data'
import { useAsyncData } from './useAsyncData'

export interface LiveWeek {
  /** True once there's an in-progress regular-season week AND a configured league id for it. */
  inScope: boolean
  byTier: Partial<Record<Tier, LiveSeasonData>>
  loading: boolean
  error: Error | undefined
}

const MAX_REGULAR_WEEK = regularSeasonWeeks('sleeper').length // 14 — playoffs are out of scope here

function tiersInScope(state: NflState | undefined): { tiers: Tier[]; leagueIds?: Record<Tier, string> } {
  const leagueIds = state ? LIVE_LEAGUE_IDS[state.year] : undefined
  if (!leagueIds || state?.seasonType !== 'regular' || state.week > MAX_REGULAR_WEEK) return { tiers: [] }
  return { tiers: Object.keys(leagueIds) as Tier[], leagueIds }
}

async function fetchAllTiers(tiers: Tier[], leagueIds: Record<Tier, string>, year: string, week: number) {
  const entries = await Promise.all(
    tiers.map(async (tier): Promise<[Tier, LiveSeasonData]> => [tier, await fetchLiveSeason(tier, year, leagueIds[tier], week)]),
  )
  return Object.fromEntries(entries) as Partial<Record<Tier, LiveSeasonData>>
}

/**
 * Live "current week" data for the home page's This Week section. Fetched once per mount — no
 * polling; reloading the page gets fresh scores (see src/data/liveSleeper.ts for why). Resolves to
 * `inScope: false` (and renders nothing upstream) whenever `LIVE_LEAGUE_IDS` has no entry for
 * whatever year Sleeper currently reports, which is the case until real 2026 league ids are added.
 */
export function useLiveWeek(): LiveWeek {
  const state = useAsyncData('nfl-state', fetchNflState)
  const { tiers, leagueIds } = tiersInScope(state.data)
  const inScope = tiers.length > 0
  const { year, week } = state.data ?? {}

  const seasons = useAsyncData(
    `live-season:${year ?? ''}:${week ?? ''}`,
    () => fetchAllTiers(tiers, leagueIds as Record<Tier, string>, year as string, week as number),
    inScope,
  )

  return {
    inScope,
    byTier: seasons.data ?? {},
    loading: state.loading || (inScope && seasons.loading),
    error: state.error ?? seasons.error,
  }
}
