import { useState } from 'react'
import { FaArrowsRotate } from 'react-icons/fa6'
import { LiveBoxScoreView } from './LiveBoxScoreBody'
import { type LiveGameRef, useLiveGame } from './liveGame'
import { TeamProfileContext } from './teamProfile'

/** Reads the scores now. Spins and holds off further clicks until that read lands. */
function RefreshButton({ refresh }: { refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const onClick = () => {
    setBusy(true)
    void refresh().finally(() => setBusy(false))
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Refresh scores"
      title="Refresh scores"
      className="flex size-8 items-center justify-center hover:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fg disabled:cursor-wait"
    >
      <FaArrowsRotate aria-hidden="true" className={busy ? 'motion-safe:animate-spin' : ''} />
    </button>
  )
}

/**
 * What the pop-out window shows: the game's live box score, re-read every minute even while the
 * site's own tab is hidden — which it usually is, since the point is watching from another tab —
 * and on demand with Refresh.
 *
 * The team-profile modal is switched off in here: it would open back in the site's tab, out of
 * sight behind whatever the viewer is doing.
 */
export function LiveMatchupPopOut({ game }: { game: LiveGameRef }) {
  const state = useLiveGame(game, undefined, true)
  return (
    <TeamProfileContext.Provider value={null}>
      <div className="min-h-screen bg-surface">
        <header className="flex items-center justify-between border-b border-border bg-accent pl-3 text-accent-fg">
          <h1 className="text-xs font-bold uppercase tracking-wide">Week {game.week} · Live</h1>
          <RefreshButton refresh={state.refresh} />
        </header>
        <LiveBoxScoreView game={game} state={state} legend={false} />
      </div>
    </TeamProfileContext.Provider>
  )
}
