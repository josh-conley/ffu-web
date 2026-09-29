import { useMemo } from 'react'
import type { AsyncState } from './useAsyncData'
import type { LiveLineups, PlayerMap } from '@/data'
import { fetchLiveLineups, fetchMissingPlayers } from '@/data'
import { startedPlayers } from '@/selectors'
import { usePlayers } from './useLeagueData'
import { useAsyncData } from './useAsyncData'
import { usePoll } from './usePoll'

export interface LiveBoxScore {
  slots: string[]
  scoring: LiveLineups['scoring']
  players: PlayerMap
  teams: LiveLineups['teams']
  /** When the lineups were last read (epoch ms); each poll moves it, so projections can follow. */
  asOf: number
}

/** Sleeper's CDN holds `/matchups` for 60s, so a faster poll would only get the same bytes back. */
const POLL_MS = 60_000

function allPlayerIds(lineups: LiveLineups): string[] {
  return lineups.teams.flatMap((t) => [...startedPlayers(t), ...t.bench, ...(t.reserve ?? [])].map((p) => p.playerId))
}

/**
 * Live starters/bench + resolved player names for a live box score, fetched lazily (only while one
 * is open). Player names resolve from the existing static players.json first (usePlayers, already
 * cached across the app); Sleeper's live directory is only hit for ids that file doesn't have yet
 * (this season's new players), so most opens don't pay that cost.
 *
 * `poll` re-reads the lineups (and so every player's points) each minute, hidden tab or not: that's
 * the popped-out matchup, which floats over other tabs. Without it the lineups are read once (a
 * one-shot poll, final after its first answer), which is all the modal needs.
 */
export function useLiveBoxScore(leagueId: string, week: number, memberIds: [string, string], { poll = false } = {}): AsyncState<LiveBoxScore> & { refresh: () => Promise<void> } {
  const players = usePlayers(true)
  const lineups = usePoll(
    `live-lineups:${leagueId}:${week}:${memberIds.join(',')}`,
    // A Refresh reads past every cache, or it would get back the answer already on screen.
    async ({ manual }) => ({ ...(await fetchLiveLineups(leagueId, week, memberIds, { fresh: manual })), asOf: Date.now() }),
    true,
    POLL_MS,
    { isFinal: () => !poll, whileHidden: poll },
  )

  // Every id in the lineup — fetchMissingPlayers filters down to the ones the static map lacks.
  const candidateIds = useMemo(() => (lineups.data ? allPlayerIds(lineups.data) : []), [lineups.data])
  const extra = useAsyncData(
    `live-players-extra:${candidateIds.join(',')}`,
    () => fetchMissingPlayers(candidateIds, players.data ?? {}),
    lineups.data !== undefined && players.data !== undefined,
  )

  const data: LiveBoxScore | undefined =
    lineups.data && players.data ? { ...lineups.data, players: { ...players.data, ...(extra.data ?? {}) } } : undefined

  return {
    data,
    loading: players.loading || lineups.loading || (lineups.data !== undefined && extra.loading),
    error: players.error ?? lineups.error ?? extra.error,
    refresh: lineups.refresh,
  }
}
