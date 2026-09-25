import type { LineupPlayer, NflGameClock, NflGameStatus, PlayerProjection, TeamLineup } from '@/data'
import { startedPlayers } from './lineups'

/** A player's NFL game this week — or `idle` when they have none (bye, free agent, unknown team). */
export type PlayerLiveStatus = NflGameStatus | 'idle'

/** Everything a live projection is derived from: the NFL week's games, projections, and one league's scoring. */
export interface LiveWeekContext {
  games: Record<string, NflGameClock>
  projections: Record<string, PlayerProjection>
  scoring: Record<string, number>
}

/** A projected stat line scored under one league's rules. Stats the league doesn't score add nothing. */
export function projectedPoints(stats: Record<string, number>, scoring: Record<string, number>): number {
  let total = 0
  for (const [stat, value] of Object.entries(stats)) total += value * (scoring[stat] ?? 0)
  return total
}

// A team defense's player id IS its team abbreviation ("BUF"), so it finds its game even when
// the projections feed has no row for it.
const teamOf = (playerId: string, ctx: LiveWeekContext) => ctx.projections[playerId]?.team ?? playerId

function clockFor(playerId: string, ctx: LiveWeekContext): NflGameClock | undefined {
  return ctx.games[teamOf(playerId, ctx)]
}

/** A player's NFL game this week, seen from their side: who they play, and where it stands. */
export interface PlayerGame extends Pick<NflGameClock, 'status' | 'kickoff' | 'quarter' | 'clock'> {
  /** "@ BUF" on the road, "vs BUF" at home. */
  opponent: string
}

/** Undefined when the player has no game this week (bye, free agent, unknown team). */
export function playerGame(playerId: string, ctx: LiveWeekContext): PlayerGame | undefined {
  const team = teamOf(playerId, ctx)
  const game = ctx.games[team]
  if (!game) return undefined
  const { status, kickoff, quarter, clock, home, away } = game
  const out: PlayerGame = { status, opponent: team === home ? `vs ${away}` : `@ ${home}` }
  if (kickoff !== undefined) out.kickoff = kickoff
  if (quarter !== undefined) out.quarter = quarter
  if (clock !== undefined) out.clock = clock
  return out
}

export function playerLiveStatus(playerId: string, ctx: LiveWeekContext): PlayerLiveStatus {
  return clockFor(playerId, ctx)?.status ?? 'idle'
}

/**
 * Points so far plus the projected points for the share of the game still to play: the full
 * projection before kickoff, a prorated slice while it's on, nothing once it's over. Prorating by
 * game clock is the usual live-projection approximation (and roughly what Sleeper's own app does).
 */
export function playerLiveProjection(player: LineupPlayer, ctx: LiveWeekContext): number {
  const clock = clockFor(player.playerId, ctx)
  const stats = ctx.projections[player.playerId]?.stats
  if (!clock || !stats) return player.points
  return player.points + projectedPoints(stats, ctx.scoring) * clock.remaining
}

/**
 * A team's projected final score — its starters' live projections summed. Undefined once there is
 * nothing left to project (every starter's game is over, or they have none), where it would only
 * repeat the actual score.
 */
export function teamLiveProjection(lineup: TeamLineup, ctx: LiveWeekContext): number | undefined {
  const started = startedPlayers(lineup)
  const stillToPlay = started.some((p) => {
    const status = playerLiveStatus(p.playerId, ctx)
    return status === 'pre' || status === 'live'
  })
  if (!stillToPlay) return undefined
  return started.reduce((sum, p) => sum + playerLiveProjection(p, ctx), 0)
}

/** Every team's projected final score in one league (teams with nothing left to project are absent). */
export function projectionsByMember(teams: TeamLineup[], ctx: LiveWeekContext): Map<string, number> {
  const out = new Map<string, number>()
  for (const team of teams) {
    const projected = teamLiveProjection(team, ctx)
    if (projected !== undefined) out.set(team.memberId, projected)
  }
  return out
}

/**
 * A live lineup with each player's NFL team filled in from the week's projections — the live
 * lineup feed doesn't carry teams (the backfilled ones get them from NFLverse), and the
 * projections row is week-accurate, so a traded player shows their new team.
 */
export function withNflTeams(lineup: TeamLineup, projections: Record<string, PlayerProjection>): TeamLineup {
  const fill = (p: LineupPlayer): LineupPlayer => {
    const team = p.team ?? projections[p.playerId]?.team
    return team ? { ...p, team } : p
  }
  return { ...lineup, starters: lineup.starters.map((p) => p && fill(p)), bench: lineup.bench.map(fill) }
}
