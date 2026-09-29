import { LiveBoxScoreBody, type LiveGameRef } from './LiveBoxScoreBody'
import { TeamProfileContext } from './teamProfile'

/**
 * What the pop-out window shows: the game's live box score, re-read every minute even while the
 * site's own tab is hidden — which it usually is, since the point is watching from another tab.
 *
 * The team-profile modal is switched off in here: it would open back in the site's tab, out of
 * sight behind whatever the viewer is doing.
 */
export function LiveMatchupPopOut({ game }: { game: LiveGameRef }) {
  return (
    <TeamProfileContext.Provider value={null}>
      <div className="min-h-screen bg-surface">
        <h1 className="border-b border-border bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-accent-fg">Week {game.week} · Live</h1>
        <LiveBoxScoreBody game={game} poll legend={false} />
      </div>
    </TeamProfileContext.Provider>
  )
}
