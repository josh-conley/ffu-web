import { type LiveBoxScore, useLiveBoxScore } from '@/hooks/useLiveBoxScore'
import { type NflWeek, useNflWeek } from '@/hooks/useNflWeek'
import { type LiveWeekContext, playerGame, starterPoints, teamLiveProjection, withNflTeams } from '@/selectors'
import { BoxScore, type BoxScoreSide, type PlayerLiveInfo } from './BoxScore'
import { gameNote } from './format'
import { LiveStatusLegend } from './LiveStatusDot'
import { LoadingSpinner } from './LoadingSpinner'

/** One live game: the league it's in, the week, and its two teams. */
export interface LiveGameRef {
  leagueId: string
  year: string
  week: number
  memberIds: [string, string]
}

type ScoreOf = (memberId: string) => number | undefined

/** Each player's game status, once the NFL week has loaded. */
function liveOfFor(ctx: LiveWeekContext) {
  return (playerId: string): PlayerLiveInfo => {
    const game = playerGame(playerId, ctx)
    return game ? { status: game.status, note: gameNote(game) } : { status: 'idle', note: undefined }
  }
}

/** Both teams' sides: their score, lineup and, with the NFL week, NFL teams and a projection. */
function sidesFor(data: LiveBoxScore, nfl: NflWeek | undefined, ctx: LiveWeekContext | undefined, scoreOf: ScoreOf | undefined): BoxScoreSide[] {
  return data.teams.map((raw) => {
    const lineup = nfl ? withNflTeams(raw, nfl.projections) : raw
    const side: BoxScoreSide = { memberId: lineup.memberId, score: scoreOf?.(lineup.memberId) ?? starterPoints(lineup), lineup }
    const projected = ctx && teamLiveProjection(lineup, ctx)
    return projected === undefined ? side : { ...side, projected }
  })
}

/** The box score's inputs, loaded: the lineups, and the NFL week's detail once it arrives. */
function useLiveGame({ leagueId, year, week, memberIds }: LiveGameRef, scoreOf: ScoreOf | undefined, poll: boolean) {
  const { data, loading } = useLiveBoxScore(leagueId, week, memberIds, { poll })
  const nfl = useNflWeek(year, week, true, poll ? data?.asOf : undefined)
  const ctx: LiveWeekContext | undefined = data && nfl ? { ...nfl, scoring: data.scoring } : undefined
  return { data, loading, sides: data ? sidesFor(data, nfl, ctx, scoreOf) : [], liveOf: ctx && liveOfFor(ctx) }
}

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
export function LiveBoxScoreBody({
  game,
  scoreOf,
  poll = false,
  legend = true,
}: {
  game: LiveGameRef
  scoreOf?: ScoreOf
  poll?: boolean
  legend?: boolean
}) {
  const { data, loading, sides, liveOf } = useLiveGame(game, scoreOf, poll)
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
