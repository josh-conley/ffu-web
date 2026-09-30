import { CUP_ACCENT } from '@/config'
import type { RoundOutline } from '@/selectors'
import { CupBracketOutline, EmptySlot } from '../CupBracketOutline'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'
import type { MatchupSide } from './DrawMatchupCard'

// The Cup bracket, filling in as the draw goes. It is the SAME bracket /cup shows before the draw
// (CupBracketOutline: one column per round, later rounds centred against earlier ones), with the
// Round of 36 column rendered live: each slot empty until its matchup is drawn, the one on the
// clock ringed. Later rounds stay empty — the draw only decides the opening round. Matchups sit in
// seeded bracket order, not draw order, so adjacent slots are the ones whose winners meet next.

export interface LedgerMatchup {
  a: MatchupSide
  b: MatchupSide
}

/** Where the draw is: the matchup on the clock, and its opponent once revealed. */
export interface BracketCursor {
  index: number
  drawer: MatchupSide
  drawn: MatchupSide | undefined
}

/** One nameplate. Every row is the same height, filled or not, so the column never changes size.
 *  Before the team is drawn it shows the seed that slot will hold — which says nothing about who. */
function Row({ side, seed }: { side: MatchupSide | undefined; seed: number | undefined }) {
  if (!side) {
    return (
      <div className="flex h-5 items-center gap-1.5 pl-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-border" aria-hidden />
        <span className="h-4 flex-1 bg-surface-2" aria-hidden />
        {seed !== undefined && <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">{seed}</span>}
      </div>
    )
  }
  return (
    <div className="flex h-5 items-center gap-1.5 pl-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${LEAGUE_STYLES[side.tier].dot}`} aria-hidden />
      <TeamLogo ffuId={side.ffuId} size={18} clickable={false} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{side.name}</span>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">{side.seed}</span>
    </div>
  )
}

function OpeningSlot({ a, b, seeds, current, tag }: {
  a: MatchupSide | undefined
  b: MatchupSide | undefined
  /** The two seeds this slot holds (drawing team's first). */
  seeds: SlotSeeds | undefined
  current: boolean
  tag: string | undefined
}) {
  return (
    <div
      data-slot
      aria-current={current ? 'step' : undefined}
      className={`space-y-1 border bg-surface p-2 ${a ? 'border-border' : 'border-dashed border-border'}`}
      // A ring, not a thicker border: the slot must not change size as the cursor moves.
      style={current ? { boxShadow: `0 0 0 3px ${CUP_ACCENT}` } : undefined}
    >
      <Row side={a} seed={seeds?.[0]} />
      <Row side={b} seed={seeds?.[1]} />
      {tag && <p className="pl-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">{tag}</p>}
    </div>
  )
}

/** The seeds in one opening-round slot, drawing team's first: e.g. [1, 36]. */
export type SlotSeeds = [number, number]

/** A Round-of-18 slot before it is played: which two opening games feed it ("W 1v36"). */
function FeederSlot({ from }: { from: (SlotSeeds | undefined)[] }) {
  return (
    <div className="space-y-1 border border-dashed border-border bg-surface p-2">
      {from.map((seeds, k) => (
        <div key={k} className="flex h-4 items-center gap-1.5 pl-1.5 font-mono text-[11px] text-muted">
          {seeds ? `W ${seeds[0]}v${seeds[1]}` : ''}
        </div>
      ))}
    </div>
  )
}

/** Who is in matchup `i` so far: both teams once drawn, the drawer (and the result, once in) if on the clock. */
function sidesOf(i: number, matchups: LedgerMatchup[], cursor: BracketCursor | undefined) {
  const done = matchups[i]
  if (done) return { a: done.a, b: done.b }
  if (cursor?.index === i) return { a: cursor.drawer, b: cursor.drawn }
  return { a: undefined, b: undefined }
}

export function DrawBracket({ rounds, order, seeds, matchups, cursor, tags = [] }: {
  /** The season's rounds (tournament.json), for the bracket's shape. */
  rounds: RoundOutline[]
  /** Draw-order index of the matchup in each opening-round slot, top to bottom (bracketSlots). */
  order: number[]
  /** Seeds per matchup, in draw order. Known before the draw: seeds say where, not who. */
  seeds: SlotSeeds[]
  /** Matchups already drawn, in draw order. */
  matchups: LedgerMatchup[]
  /** The matchup being drawn now, if any. */
  cursor?: BracketCursor
  /** Optional one-line note per matchup, in draw order (the head-to-head tag, once complete). */
  tags?: string[]
}) {
  const slot = (round: number, position: number) => {
    // The Round of 18 is a fixed tree off the opening round, so its slots can name their feeders.
    // Later rounds re-seed after the lowest-winner drop, so they stay blank.
    if (round === 1) return <FeederSlot from={[order[position * 2], order[position * 2 + 1]].map((i) => (i === undefined ? undefined : seeds[i]))} />
    if (round > 1) return <EmptySlot />
    // Slots are in bracket order, so the draw fills them out of sequence: matchup 1 (1v36) at the
    // top, matchup 18 (18v19) right beneath it, as the seeds dictate.
    const i = order[position]
    if (i === undefined) return <EmptySlot />
    return <OpeningSlot {...sidesOf(i, matchups, cursor)} seeds={seeds[i]} current={cursor?.index === i} tag={tags[i]} />
  }
  return <CupBracketOutline rounds={rounds} slot={slot} firstWidth="w-60" bleed={false} label="Cup bracket" />
}
