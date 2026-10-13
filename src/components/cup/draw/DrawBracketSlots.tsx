import { CUP_ACCENT } from '@/config'
import type { TeamForm } from '@/selectors'
import { uprLabel } from '../../format'
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

/** The name, and under it (when the bracket shows ratings) the team's UPR going into the round. */
function NameBlock({ side, formOf }: { side: MatchupSide; formOf: ((ffuId: string) => TeamForm | undefined) | undefined }) {
  const name = <span className="min-w-0 truncate text-sm font-semibold">{side.name}</span>
  if (!formOf) return <span className="flex min-w-0 flex-1">{name}</span>
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      {name}
      <span className="font-mono text-[10px] leading-tight tabular-nums text-muted">{uprLabel(formOf(side.ffuId))}</span>
    </span>
  )
}

/**
 * One nameplate. Before the team is drawn it shows the seed that slot will hold — where, not who.
 * With `formOf` every row is two lines tall, drawn or not, so the bracket keeps its shape.
 */
function Row({ side, seed, formOf }: { side: MatchupSide | undefined; seed: number | undefined; formOf?: (ffuId: string) => TeamForm | undefined }) {
  return (
    <div className={`flex items-center gap-1.5 pl-1 ${formOf ? 'h-9' : 'h-5'}`}>
      {side ? (
        <>
          <span className={`h-2 w-2 shrink-0 rounded-full ${LEAGUE_STYLES[side.tier].dot}`} aria-hidden />
          <TeamLogo ffuId={side.ffuId} size={18} clickable={false} />
          <NameBlock side={side} formOf={formOf} />
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

/**
 * An opening-round (Round of 36) slot: empty until drawn, ringed while on the clock. Once drawn,
 * `onOpen` makes it a button that opens the game's matchup modal.
 */
export function OpeningSlot({ position, a, b, seeds, current, tag, onOpen, formOf }: {
  /** Top-to-bottom place in the bracket (0–17), for tests and screen readers. */
  position: number
  a: MatchupSide | undefined
  b: MatchupSide | undefined
  seeds: SlotSeeds | undefined
  current: boolean
  tag: string | undefined
  onOpen?: () => void
  /** Each drawn team's UPR going into the round, under its name. */
  formOf?: (ffuId: string) => TeamForm | undefined
}) {
  const props = {
    'data-slot': position,
    'aria-current': current ? ('step' as const) : undefined,
    // A ring, not a thicker border: the slot must not change size as the cursor moves.
    style: current ? { boxShadow: `0 0 0 3px ${CUP_ACCENT}` } : undefined,
  }
  const base = `block w-full space-y-1 border bg-surface p-1.5 text-left ${a ? 'border-border' : 'border-dashed border-border'}`
  const body = (
    <>
      <Row side={a} seed={seeds?.[0]} formOf={formOf} />
      <Row side={b} seed={seeds?.[1]} formOf={formOf} />
      {tag && <p className="pl-1 text-[10px] font-bold uppercase tracking-wide text-muted">{tag}</p>}
    </>
  )
  if (!onOpen || !a || !b) return <div {...props} className={base}>{body}</div>
  return (
    <button
      type="button"
      {...props}
      onClick={onOpen}
      aria-label={`${a.name} v ${b.name}: open the matchup`}
      className={`${base} cursor-pointer transition-colors hover:border-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
    >
      {body}
    </button>
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
