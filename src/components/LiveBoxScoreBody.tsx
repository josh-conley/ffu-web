import { BoxScore } from './BoxScore'
import { LiveStatusLegend } from './LiveStatusDot'
import { LoadingSpinner } from './LoadingSpinner'
import { type LiveGameRef, type ScoreOf, useLiveGame } from './liveGame'

/**
 * A live game's box score, sourced from Sleeper — the body of LiveLineupModal and of the
 * popped-out matchup. `poll` keeps it current (see useLiveBoxScore); the NFL week's clocks and
 * projections are then re-read alongside each new read of the lineups.
 *
 * Once the NFL week loads (useNflWeek), each player is marked played / playing / yet to play (with
 * their kickoff or game clock and opponent inline while it's still to come or on), and each side
 * gets a projected final score; the same feed supplies each player's NFL team, which the live
 * lineups lack. It loads after the lineups and may not load at all (undocumented feed), so the box
 * score never waits on it.
 *
 * `scoreOf` supplies the score to head each side with when the caller has one; without it the
 * starters' own total stands in (0.00 before kickoff).
 */
export function LiveBoxScoreBody({ game, scoreOf, poll = false }: { game: LiveGameRef; scoreOf?: ScoreOf; poll?: boolean }) {
  return <LiveBoxScoreView game={game} state={useLiveGame(game, scoreOf, poll)} />
}

/** The rendering half, for a caller that also wants the loaded state (the pop-out's Refresh). */
export function LiveBoxScoreView({ game, state: { data, loading, sides, liveOf }, legend = true }: { game: LiveGameRef; state: ReturnType<typeof useLiveGame>; legend?: boolean }) {
  const [sideA, sideB] = sides
  if (loading) return <div className="p-10"><LoadingSpinner /></div>
  if (!data || !sideA || !sideB) return <p className="p-6 text-sm text-muted">Lineups aren't available for this game.</p>
  return (
    <>
      <BoxScore slots={data.slots} players={data.players} year={game.year} sides={[sideA, sideB]} liveOf={liveOf} />
      {liveOf && legend && <LiveStatusLegend />}
    </>
  )
}
