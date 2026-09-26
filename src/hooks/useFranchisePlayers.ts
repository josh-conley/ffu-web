import { useMemo } from 'react'
import { franchisePlayers, playerAppearances, type PlayerSummary } from '@/selectors'
import { useAllLineups, useAllSeasons, usePlayers } from './useLeagueData'

export interface FranchisePlayersState {
  rows: PlayerSummary[] | undefined
  loading: boolean
  error: Error | undefined
}

/**
 * A member's franchise players. Reads EVERY lineup file (~240KB gzipped), so only call it from a
 * component that mounts once the section is near the viewport (see FranchisePlayers) — never on a
 * page's first render. The provider caches the files, so the Players page reuses them.
 */
export function useFranchisePlayers(memberId: string): FranchisePlayersState {
  const lineups = useAllLineups()
  const players = usePlayers()
  const seasons = useAllSeasons()
  const appearances = useMemo(
    () => (lineups.data && seasons.data ? playerAppearances(lineups.data, seasons.data) : undefined),
    [lineups.data, seasons.data],
  )
  const rows = useMemo(
    () => (appearances && players.data ? franchisePlayers(appearances, players.data, memberId) : undefined),
    [appearances, players.data, memberId],
  )
  return {
    rows,
    loading: lineups.loading || players.loading || seasons.loading,
    error: lineups.error ?? players.error ?? seasons.error,
  }
}
