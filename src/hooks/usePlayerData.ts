import type { DraftData, PlayerMap, SeasonData, SeasonLineups } from '@/data'
import { useAllDrafts, useAllLineups, useAllSeasons, usePlayers } from './useLeagueData'

export interface PlayerData {
  lineups: SeasonLineups[] | undefined
  players: PlayerMap | undefined
  seasons: SeasonData[] | undefined
  drafts: DraftData[]
  loading: boolean
  error: Error | undefined
}

const NO_DRAFTS: DraftData[] = []

/**
 * Everything the player pages read, with ONE loading + error for the set: every lineup file (who
 * rostered and started whom), the player map, every season (playoff weeks + champions) and every
 * draft. All are cached by the provider, so moving between the index and a player costs nothing.
 */
export function usePlayerData(): PlayerData {
  const lineups = useAllLineups()
  const players = usePlayers()
  const seasons = useAllSeasons()
  const drafts = useAllDrafts()
  return {
    lineups: lineups.data,
    players: players.data,
    seasons: seasons.data,
    drafts: drafts.data ?? NO_DRAFTS,
    loading: lineups.loading || players.loading || seasons.loading || drafts.loading,
    error: lineups.error ?? players.error ?? seasons.error ?? drafts.error,
  }
}
