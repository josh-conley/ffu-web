import { LEAGUE_STYLES } from '../../leagues'
import type { MatchupSide } from './DrawMatchupCard'

export interface LedgerMatchup {
  a: MatchupSide
  b: MatchupSide
}

// Matchups already made, newest at the top so the last reveal is always the one in view on stream.

export function DrawLedger({ matchups }: { matchups: LedgerMatchup[] }) {
  if (matchups.length === 0) {
    return <p className="text-base text-muted">No matchups drawn yet.</p>
  }
  return (
    <ol className="space-y-1">
      {[...matchups].reverse().map((matchup, i) => {
        const number = matchups.length - i
        return (
          <li key={number} className="flex items-center gap-2 border border-border bg-surface px-3 py-2 text-sm">
            <span className="w-6 shrink-0 text-right font-mono font-bold tabular-nums text-muted">{number}</span>
            <span className={`size-2 shrink-0 rounded-full ${LEAGUE_STYLES[matchup.a.tier].dot}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-semibold">{matchup.a.name}</span>
            <span className="shrink-0 text-xs font-bold uppercase text-muted">v</span>
            <span className={`size-2 shrink-0 rounded-full ${LEAGUE_STYLES[matchup.b.tier].dot}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-semibold">{matchup.b.name}</span>
          </li>
        )
      })}
    </ol>
  )
}
