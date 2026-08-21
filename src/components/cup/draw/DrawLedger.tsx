import { LEAGUE_STYLES } from '../../leagues'
import type { TieSide } from './DrawTieCard'

export interface LedgerTie {
  a: TieSide
  b: TieSide
}

// Ties already made, newest at the top so the last reveal is always the one in view on stream.

export function DrawLedger({ ties }: { ties: LedgerTie[] }) {
  if (ties.length === 0) {
    return <p className="text-sm text-muted">No ties drawn yet.</p>
  }
  return (
    <ol className="space-y-1">
      {[...ties].reverse().map((tie, i) => {
        const number = ties.length - i
        return (
          <li key={number} className="flex items-center gap-2 border border-border bg-surface px-2 py-1.5 text-xs">
            <span className="w-5 shrink-0 text-right font-mono font-bold tabular-nums text-muted">{number}</span>
            <span className={`size-2 shrink-0 rounded-full ${LEAGUE_STYLES[tie.a.tier].dot}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-semibold">{tie.a.name}</span>
            <span className="shrink-0 text-[10px] font-bold uppercase text-muted">v</span>
            <span className={`size-2 shrink-0 rounded-full ${LEAGUE_STYLES[tie.b.tier].dot}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-semibold">{tie.b.name}</span>
          </li>
        )
      })}
    </ol>
  )
}
