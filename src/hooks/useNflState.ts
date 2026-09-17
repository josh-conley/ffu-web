import { fetchNflState } from '@/data'
import { LIVE_LEAGUE_IDS } from '@/config'
import { useAsyncData } from './useAsyncData'

// Whether any season is configured as live at all. With none (the offseason state), nothing that
// depends on Sleeper's clock can be in scope, so the call is skipped entirely and the feature costs
// nothing.
export const LIVE_SEASON_CONFIGURED = Object.keys(LIVE_LEAGUE_IDS).length > 0

/**
 * Sleeper's own clock — what season and week the NFL is on. One shared subscription key, so the
 * pages that need it (the home page's live block, the Matchups page's live-week badge) ask once
 * each rather than each inventing their own call.
 */
export function useNflState(enabled = true) {
  return useAsyncData('nfl-state', fetchNflState, LIVE_SEASON_CONFIGURED && enabled)
}
