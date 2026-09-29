import { FaUpRightFromSquare } from 'react-icons/fa6'
import { LiveBoxScoreBody } from './LiveBoxScoreBody'
import type { LiveGameRef } from './liveGame'
import { LineupModalFrame } from './LineupModalFrame'
import { usePopOut } from './popOut'

/**
 * Live counterpart to LineupModal.tsx — same BoxScore body, sourced from Sleeper at click time
 * (the static lineups file this normally reads doesn't exist yet for an in-progress season).
 *
 * Takes a week and two members rather than a Game, because the useful cases include weeks that
 * aren't games yet: the one being played, and the ones still to come, where Sleeper knows the
 * lineups but there is no result to read. `scoreOf` supplies the score to head each side with when
 * a game does exist.
 *
 * Where the browser supports it, "Pop out" moves the game into a floating window that stays on
 * top of other tabs and keeps its scores current (PopOutProvider), and closes the modal.
 */
export function LiveLineupModal({
  scoreOf,
  onClose,
  ...game
}: LiveGameRef & {
  scoreOf?: (memberId: string) => number | undefined
  onClose: () => void
}) {
  const popOut = usePopOut()
  const action = popOut && (
    <button
      type="button"
      // The modal stays up if the window doesn't open (the browser refused it), so nothing vanishes.
      onClick={() => void popOut(game).then(onClose, () => undefined)}
      title="Float this game in a window that stays on top"
      className="flex h-11 shrink-0 items-center gap-2 px-3 text-xs font-bold uppercase tracking-wide hover:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fg"
    >
      <FaUpRightFromSquare aria-hidden="true" />
      Pop out
    </button>
  )
  return (
    <LineupModalFrame title={`Week ${game.week} · Live`} memberIds={game.memberIds} action={action || undefined} onClose={onClose}>
      <LiveBoxScoreBody game={game} scoreOf={scoreOf} />
    </LineupModalFrame>
  )
}
