import type { ReactNode } from 'react'
import { LiveBoxScoreBody } from './LiveBoxScoreBody'
import type { LiveGameRef } from './liveGame'
import { LineupModalFrame } from './LineupModalFrame'

/**
 * Live counterpart to LineupModal.tsx — same BoxScore body, sourced from Sleeper at click time
 * (the static lineups file this normally reads doesn't exist yet for an in-progress season).
 *
 * Takes a week and two members rather than a Game, because the useful cases include weeks that
 * aren't games yet: the one being played, and the ones still to come, where Sleeper knows the
 * lineups but there is no result to read. `scoreOf` supplies the score to head each side with when
 * a game does exist.
 */
export function LiveLineupModal({
  scoreOf,
  title,
  lead,
  onClose,
  ...game
}: LiveGameRef & {
  scoreOf?: (memberId: string) => number | undefined
  /** The title bar's text; "Week N · Live" by default. */
  title?: ReactNode
  /** Something to show above the box score (the Cup's record-and-UPR strip). */
  lead?: ReactNode
  onClose: () => void
}) {
  return (
    <LineupModalFrame title={title ?? `Week ${game.week} · Live`} memberIds={game.memberIds} onClose={onClose}>
      {lead}
      <LiveBoxScoreBody game={game} scoreOf={scoreOf} />
    </LineupModalFrame>
  )
}
