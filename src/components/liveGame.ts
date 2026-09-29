import { type LiveBoxScore, useLiveBoxScore } from '@/hooks/useLiveBoxScore'
import { type NflWeek, useNflWeek } from '@/hooks/useNflWeek'
import { type LiveWeekContext, playerGame, starterPoints, teamLiveProjection, withNflTeams } from '@/selectors'
import type { BoxScoreSide, PlayerLiveInfo } from './BoxScore'
import { gameNote } from './format'

// A live game's box-score state, apart from its rendering (LiveBoxScoreBody) so the pop-out can
// hold the state itself for its Refresh button.

/** One live game: the league it's in, the week, and its two teams. */
export interface LiveGameRef {
  leagueId: string
  year: string
  week: number
  memberIds: [string, string]
}

export type ScoreOf = (memberId: string) => number | undefined

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
export function useLiveGame({ leagueId, year, week, memberIds }: LiveGameRef, scoreOf: ScoreOf | undefined, poll: boolean) {
  const { data, loading, refresh } = useLiveBoxScore(leagueId, week, memberIds, { poll })
  const nfl = useNflWeek(year, week, true, poll ? data?.asOf : undefined)
  const ctx: LiveWeekContext | undefined = data && nfl ? { ...nfl, scoring: data.scoring } : undefined
  return { data, loading, refresh, sides: data ? sidesFor(data, nfl, ctx, scoreOf) : [], liveOf: ctx && liveOfFor(ctx) }
}

