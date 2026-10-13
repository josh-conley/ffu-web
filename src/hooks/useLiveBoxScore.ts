import { useMemo } from 'react'
import type { AsyncState } from './useAsyncData'
import type { LiveLineups, PlayerMap } from '@/data'
import { fetchLiveLineups, fetchMissingPlayers } from '@/data'
import { startedPlayers } from '@/selectors'
import { usePlayers } from './useLeagueData'
import { useAsyncData } from './useAsyncData'

export interface LiveBoxScore {
  slots: string[]
  scoring: LiveLineups['scoring']
  players: PlayerMap
  teams: LiveLineups['teams']
}

function allPlayerIds(lineups: LiveLineups): string[] {
  return lineups.teams.flatMap((t) => [...startedPlayers(t), ...t.bench, ...(t.reserve ?? [])].map((p) => p.playerId))
}

interface LiveGame {
  leagueIds: readonly [string, string]
  year: string
  week: number
  memberIds: [string, string]
}

/**
 * Live starters/bench + resolved player names for a live box score, read once when the modal opens.
 * Player names resolve from the existing static players.json first (usePlayers, already cached
 * across the app), then from the week's projections (this season's new players); Sleeper's full
 * directory is only hit for a player neither names, which should almost never happen.
 */
export function useLiveBoxScore(game: LiveGame): AsyncState<LiveBoxScore> {
  const { leagueIds, week, memberIds } = game
  const players = usePlayers(true)
  const lineups = useAsyncData(
    `live-lineups:${leagueIds.join(',')}:${week}:${memberIds.join(',')}`,
    () => fetchLiveLineups(leagueIds, week, memberIds),
    true,
  )

  // Every id in the lineup — fetchMissingPlayers filters down to the ones the static map lacks.
  const candidateIds = useMemo(() => (lineups.data ? allPlayerIds(lineups.data) : []), [lineups.data])
  const extra = useAsyncData(
    `live-players-extra:${candidateIds.join(',')}`,
    () => fetchMissingPlayers(candidateIds, players.data ?? {}, game),
    lineups.data !== undefined && players.data !== undefined,
  )

  const data: LiveBoxScore | undefined =
    lineups.data && players.data
      ? { slots: lineups.data.slots, scoring: lineups.data.scoring, teams: lineups.data.teams, players: { ...players.data, ...(extra.data ?? {}) } }
      : undefined

  return {
    data,
    loading: players.loading || lineups.loading || (lineups.data !== undefined && extra.loading),
    error: players.error ?? lineups.error ?? extra.error,
  }
}
