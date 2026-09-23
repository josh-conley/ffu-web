import { useLiveBoxScore } from '@/hooks/useLiveBoxScore'
import { starterPoints } from '@/selectors'
import { BoxScore, type BoxScoreSide } from './BoxScore'
import { LineupModalFrame } from './LineupModalFrame'
import { LoadingSpinner } from './LoadingSpinner'

/**
 * Live counterpart to LineupModal.tsx — same BoxScore body, sourced from Sleeper at click time
 * (the static lineups file this normally reads doesn't exist yet for an in-progress season).
 *
 * Takes a week and two members rather than a Game, because the useful cases include weeks that
 * aren't games yet: the one being played, and the ones still to come, where Sleeper knows the
 * lineups but there is no result to read. `scoreOf` supplies the score to head each side with when
 * a game does exist; without it the starters' own total stands in (0.00 before kickoff).
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

  const sides: BoxScoreSide[] = data
    ? data.teams.map((lineup) => ({ memberId: lineup.memberId, score: scoreOf?.(lineup.memberId) ?? starterPoints(lineup), lineup }))
    : []
  const [sideA, sideB] = sides

  return (
    <LineupModalFrame title={`Week ${week} · Live`} memberIds={memberIds} onClose={onClose}>
      {loading ? (
        <div className="p-10"><LoadingSpinner /></div>
      ) : data && sideA && sideB ? (
        <BoxScore slots={data.slots} players={data.players} year={year} sides={[sideA, sideB]} />
      ) : (
        <p className="p-6 text-sm text-muted">Lineups aren't available for this game.</p>
      )}
    </LineupModalFrame>
  )
}
