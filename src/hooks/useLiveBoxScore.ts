import { useMemo } from 'react'
import type { AsyncState } from './useAsyncData'
import type { LiveLineups, NflGameClock, PlayerMap } from '@/data'
import { fetchLiveLineups, fetchMissingPlayers } from '@/data'
import { startedPlayers } from '@/selectors'
import { usePlayers } from './useLeagueData'
import { useAsyncData } from './useAsyncData'
import { liveScoreInterval, readFresh, readGameClocks } from './liveScoreRead'
import { usePoll } from './usePoll'

export interface LiveBoxScore {
  slots: string[]
  scoring: LiveLineups['scoring']
  players: PlayerMap
  teams: LiveLineups['teams']
  /** When the lineups were last read (epoch ms); each poll moves it, so projections can follow. */
  asOf: number
}

function allPlayerIds(lineups: LiveLineups): string[] {
  return lineups.teams.flatMap((t) => [...startedPlayers(t), ...t.bench, ...(t.reserve ?? [])].map((p) => p.playerId))
}

interface Read {
  game: { leagueId: string; year: string; week: number; memberIds: [string, string] }
  poll: boolean
  manual: boolean
}

/**
 * One read of the lineups. Polled, it follows the home page's rule (liveScoreRead): past Sleeper's
 * CDN only while NFL games are on. A Refresh always reads past every cache, or it would get back
 * the answer already on screen.
 */
async function readLineups({ game: { leagueId, year, week, memberIds }, poll, manual }: Read) {
  const clocks: NflGameClock[] | undefined = poll ? await readGameClocks(year, week) : undefined
  const fresh = poll ? readFresh(clocks, manual) : manual
  return { ...(await fetchLiveLineups(leagueId, week, memberIds, { fresh })), asOf: Date.now(), clocks }
}

/**
 * Live starters/bench + resolved player names for a live box score, fetched lazily (only while one
 * is open). Player names resolve from the existing static players.json first (usePlayers, already
 * cached across the app); Sleeper's live directory is only hit for ids that file doesn't have yet
 * (this season's new players), so most opens don't pay that cost.
 *
 * `poll` re-reads the lineups (and so every player's points) each minute while NFL games are on, hidden
 * tab or not: that's the popped-out matchup, which floats over other tabs. Without it the lineups are read once (a
 * one-shot poll, final after its first answer), which is all the modal needs.
 */
export function useLiveBoxScore(
  game: Read['game'],
  { poll = false } = {},
): AsyncState<LiveBoxScore> & { refresh: () => Promise<void> } {
  const players = usePlayers(true)
  const lineups = usePoll(
    `live-lineups:${game.leagueId}:${game.week}:${game.memberIds.join(',')}`,
    ({ manual }) => readLineups({ game, poll, manual }),
    true,
    liveScoreInterval,
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
    lineups.data && players.data
      ? { slots: lineups.data.slots, scoring: lineups.data.scoring, teams: lineups.data.teams, asOf: lineups.data.asOf, players: { ...players.data, ...(extra.data ?? {}) } }
      : undefined

  return {
    data,
    loading: players.loading || lineups.loading || (lineups.data !== undefined && extra.loading),
    error: players.error ?? lineups.error ?? extra.error,
    refresh: lineups.refresh,
  }
}
