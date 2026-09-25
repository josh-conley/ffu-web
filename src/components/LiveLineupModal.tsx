import { useLiveBoxScore } from '@/hooks/useLiveBoxScore'
import { useNflWeek } from '@/hooks/useNflWeek'
import { type LiveWeekContext, playerGame, starterPoints, teamLiveProjection, withNflTeams } from '@/selectors'
import { BoxScore, type BoxScoreSide, type PlayerLiveInfo } from './BoxScore'
import { gameNote } from './format'
import { LineupModalFrame } from './LineupModalFrame'
import { LiveStatusLegend } from './LiveStatusDot'
import { LoadingSpinner } from './LoadingSpinner'

/**
 * Live counterpart to LineupModal.tsx — same BoxScore body, sourced from Sleeper at click time
 * (the static lineups file this normally reads doesn't exist yet for an in-progress season).
 *
 * Takes a week and two members rather than a Game, because the useful cases include weeks that
 * aren't games yet: the one being played, and the ones still to come, where Sleeper knows the
 * lineups but there is no result to read. `scoreOf` supplies the score to head each side with when
 * a game does exist; without it the starters' own total stands in (0.00 before kickoff).
 *
 * Once the NFL week loads (useNflWeek), each player is marked played / playing / yet to play (with
 * their kickoff or game clock and opponent inline while it's still to come or on), and
 * each side gets a projected final score; the same feed supplies each player's NFL team, which the
 * live lineups lack. It loads after the lineups and may not load at all
 * (undocumented feed), so the box score never waits on it.
 */
export function LiveLineupModal({
  leagueId,
  year,
  week,
  memberIds,
  scoreOf,
  onClose,
}: {
  leagueId: string
  year: string
  week: number
  memberIds: [string, string]
  scoreOf?: (memberId: string) => number | undefined
  onClose: () => void
}) {
  const { data, loading } = useLiveBoxScore(leagueId, week, memberIds, true)
  const nfl = useNflWeek(year, week, true)
  const ctx: LiveWeekContext | undefined = data && nfl ? { ...nfl, scoring: data.scoring } : undefined
  const liveOf =
    ctx &&
    ((playerId: string): PlayerLiveInfo => {
      const game = playerGame(playerId, ctx)
      return game ? { status: game.status, note: gameNote(game) } : { status: 'idle', note: undefined }
    })

  const sides: BoxScoreSide[] = data
    ? data.teams.map((raw) => {
        const lineup = nfl ? withNflTeams(raw, nfl.projections) : raw
        const side: BoxScoreSide = { memberId: lineup.memberId, score: scoreOf?.(lineup.memberId) ?? starterPoints(lineup), lineup }
        const projected = ctx && teamLiveProjection(lineup, ctx)
        return projected === undefined ? side : { ...side, projected }
      })
    : []
  const [sideA, sideB] = sides

  return (
    <LineupModalFrame title={`Week ${week} · Live`} live memberIds={memberIds} onClose={onClose}>
      {loading ? (
        <div className="p-10"><LoadingSpinner /></div>
      ) : data && sideA && sideB ? (
        <>
          <BoxScore slots={data.slots} players={data.players} year={year} sides={[sideA, sideB]} liveOf={liveOf} />
          {ctx && <LiveStatusLegend />}
        </>
      ) : (
        <p className="p-6 text-sm text-muted">Lineups aren't available for this game.</p>
      )}
    </LineupModalFrame>
  )
}
