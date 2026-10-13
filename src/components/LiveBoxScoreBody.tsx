import { BoxScore } from './BoxScore'
import { LiveStatusLegend } from './LiveStatusDot'
import { LoadingSpinner } from './LoadingSpinner'
import { type LiveGameRef, type ScoreOf, useLiveGame } from './liveGame'

/**
 * A live game's box score, sourced from Sleeper — the body of LiveLineupModal, read once on open.
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
export function LiveBoxScoreBody({ game, scoreOf }: { game: LiveGameRef; scoreOf?: ScoreOf }) {
  const { data, loading, sides, liveOf } = useLiveGame(game, scoreOf)
  const [sideA, sideB] = sides
  if (loading) return <div className="p-10"><LoadingSpinner /></div>
  if (!data || !sideA || !sideB) return <p className="p-6 text-sm text-muted">Lineups aren't available for this game.</p>
  return (
    <>
      <BoxScore slots={data.slots} players={data.players} year={game.year} sides={[sideA, sideB]} liveOf={liveOf} />
      {liveOf && <LiveStatusLegend />}
    </>
  )
}
