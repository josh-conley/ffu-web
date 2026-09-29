import type { NflGameClock } from '@/data'

// How often the live scores are worth re-reading, from where the week's NFL games stand. Fantasy
// points only move while a game is being played (and for a little while after, as stat corrections
// land), so most of a week there is nothing to poll for: only the next kickoff is worth waking for.

/** While scores are moving: every minute, read past Sleeper's CDN (see sleeperApi). */
export const LIVE_POLL_MS = 60_000
/** Between games: slow, ordinary reads — enough to notice anything unexpected, like a flexed kickoff. */
export const IDLE_POLL_MS = 15 * 60_000
/**
 * How long after kickoff a finished game still counts as moving. An NFL game runs about 3h10m, so
 * this covers the last stat corrections in the hour or so after it ends. From kickoff because
 * Sleeper's feed doesn't say when a game ended.
 */
const SETTLE_MS = 4 * 60 * 60_000

function moving(game: NflGameClock, now: number): boolean {
  if (game.status === 'live') return true
  if (game.kickoff === undefined) return false
  // Past kickoff but not yet reported live: the feed is behind, not the game.
  if (game.status === 'pre') return game.kickoff <= now
  return now - game.kickoff < SETTLE_MS
}

/** True while any game's fantasy points could still be changing. */
export function scoresMoving(games: readonly NflGameClock[], now: number): boolean {
  return games.some((game) => moving(game, now))
}

/**
 * The wait before the next read. Without the game clocks (their feed is undocumented and may fail)
 * it assumes scores are moving: polling too often beats a board that silently stops.
 */
export function livePollDelay(games: readonly NflGameClock[] | undefined, now: number): number {
  if (games === undefined || scoresMoving(games, now)) return LIVE_POLL_MS
  const kickoffs = games.flatMap((game) => (game.status === 'pre' && game.kickoff !== undefined ? [game.kickoff] : []))
  if (kickoffs.length === 0) return IDLE_POLL_MS
  return Math.min(IDLE_POLL_MS, Math.max(LIVE_POLL_MS, Math.min(...kickoffs) - now))
}
