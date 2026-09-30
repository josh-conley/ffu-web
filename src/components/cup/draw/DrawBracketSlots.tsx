import { CUP_ACCENT } from '@/config'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'
import type { MatchupSide } from './DrawMatchupCard'

// The pieces of the draw's bracket. Every slot has a fixed height, filled or not, so nothing on the
// bracket moves as the draw goes on.

export interface LedgerMatchup {
  a: MatchupSide
  b: MatchupSide
}

/** The seeds in one opening-round slot, drawing team's first: e.g. [1, 36]. */
export type SlotSeeds = [number, number]

/** One nameplate. Before the team is drawn it shows the seed that slot will hold — where, not who. */
function Row({ side, seed }: { side: MatchupSide | undefined; seed: number | undefined }) {
  return (
    <div className="flex h-5 items-center gap-1.5 pl-1">
      {side ? (
        <>
          <span className={`h-2 w-2 shrink-0 rounded-full ${LEAGUE_STYLES[side.tier].dot}`} aria-hidden />
          <TeamLogo ffuId={side.ffuId} size={18} clickable={false} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{side.name}</span>
        </>
      ) : (
        <>
          <span className="h-2 w-2 shrink-0 rounded-full bg-border" aria-hidden />
          <span className="h-3.5 flex-1 bg-surface-2" aria-hidden />
        </>
      )}
      {(side?.seed ?? seed) !== undefined && (
        <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted">{side?.seed ?? seed}</span>
      )}
    </div>
  )
}

/** An opening-round (Round of 36) slot: empty until drawn, ringed while on the clock. */
export function OpeningSlot({ position, a, b, seeds, current, tag }: {
  /** Top-to-bottom place in the bracket (0–17), for tests and screen readers. */
  position: number
  a: MatchupSide | undefined
  b: MatchupSide | undefined
  seeds: SlotSeeds | undefined
  current: boolean
  tag: string | undefined
}) {
  return (
    <div
      data-slot={position}
      aria-current={current ? 'step' : undefined}
      className={`space-y-1 border bg-surface p-1.5 ${a ? 'border-border' : 'border-dashed border-border'}`}
      // A ring, not a thicker border: the slot must not change size as the cursor moves.
      style={current ? { boxShadow: `0 0 0 3px ${CUP_ACCENT}` } : undefined}
    >
      <Row side={a} seed={seeds?.[0]} />
      <Row side={b} seed={seeds?.[1]} />
      {tag && <p className="pl-1 text-[10px] font-bold uppercase tracking-wide text-muted">{tag}</p>}
    </div>
  )
}

/** A Round-of-18 slot before it is played: which two opening games feed it ("W 1v36"). */
export function FeederSlot({ from }: { from: (SlotSeeds | undefined)[] }) {
  return (
    <div className="space-y-1 border border-dashed border-border bg-surface p-1.5">
      {from.map((seeds, k) => (
        <div key={k} className="flex h-5 items-center pl-1 font-mono text-[11px] text-muted">
          {seeds ? `W ${seeds[0]}v${seeds[1]}` : ''}
        </div>
      ))}
    </div>
  )
}

/** A later-round slot: blank, because the quarterfinals re-seed after the lowest-winner drop. */
export function BlankSlot() {
  return (
    <div className="space-y-1 border border-dashed border-border bg-surface p-1.5" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="flex h-5 items-center gap-1.5 pl-1">
          <span className="h-2 w-2 shrink-0 rounded-full bg-border" />
          <span className="h-3.5 flex-1 bg-surface-2" />
        </div>
      ))}
    </div>
  )
}
