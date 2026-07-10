import { useMemo } from 'react'
import type { AsyncState } from './useAsyncData'
import type { LiveLineups, PlayerMap } from '@/data'
import { fetchLiveLineups, fetchMissingPlayers } from '@/data'
import { usePlayers } from './useLeagueData'
import { useAsyncData } from './useAsyncData'

export interface LiveBoxScore {
  slots: string[]
  players: PlayerMap
  teams: LiveLineups['teams']
}

function allPlayerIds(lineups: LiveLineups): string[] {
  return lineups.teams.flatMap((t) => [...t.starters, ...t.bench].map((p) => p.playerId))
}

/**
 * Live starters/bench + resolved player names for the box-score modal — fetched lazily, only while
 * the modal is open. Player names resolve from the existing static players.json first (usePlayers,
 * already cached across the app); Sleeper's live directory is only hit for ids that file doesn't
 * have yet (this season's new players), so most opens don't pay that cost.
 */
export function useLiveBoxScore(leagueId: string, week: number, memberIds: [string, string], enabled: boolean): AsyncState<LiveBoxScore> {
  const players = usePlayers(enabled)
  const lineups = useAsyncData(`live-lineups:${leagueId}:${week}:${memberIds.join(',')}`, () => fetchLiveLineups(leagueId, week, memberIds), enabled)

  const missingIds = useMemo(() => (lineups.data ? allPlayerIds(lineups.data) : []), [lineups.data])
  const extra = useAsyncData(
    `live-players-extra:${missingIds.join(',')}`,
    () => fetchMissingPlayers(missingIds, players.data ?? {}),
    enabled && lineups.data !== undefined && players.data !== undefined,
  )

  const data: LiveBoxScore | undefined =
    lineups.data && players.data
      ? { slots: lineups.data.slots, teams: lineups.data.teams, players: { ...players.data, ...(extra.data ?? {}) } }
      : undefined

  return {
    data,
    loading: players.loading || lineups.loading || (lineups.data !== undefined && extra.loading),
    error: players.error ?? lineups.error ?? extra.error,
  }
}
