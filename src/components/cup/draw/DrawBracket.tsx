import { CUP_ACCENT } from '@/config'
import type { RoundOutline } from '@/selectors'
import { CupBracketOutline, EmptySlot } from '../CupBracketOutline'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'
import type { MatchupSide } from './DrawMatchupCard'

// The Cup bracket, filling in as the draw goes. It is the SAME bracket /cup shows before the draw
// (CupBracketOutline: one column per round, later rounds centred against earlier ones), with the
// Round of 36 column rendered live: each slot empty until its matchup is drawn, the one on the
// clock ringed. Later rounds stay empty — the draw only decides the opening round.

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

/** One nameplate. Every row is the same height, filled or not, so the column never changes size. */
function Row({ side }: { side: MatchupSide | undefined }) {
  if (!side) {
    return (
      <div className="flex h-5 items-center gap-1.5 pl-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-border" aria-hidden />
        <span className="h-4 flex-1 bg-surface-2" aria-hidden />
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

function OpeningSlot({ a, b, current, tag }: {
  a: MatchupSide | undefined
  b: MatchupSide | undefined
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
      <Row side={a} />
      <Row side={b} />
      {tag && <p className="pl-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">{tag}</p>}
    </div>
  )
}

export function DrawBracket({ rounds, matchups, cursor, tags = [] }: {
  /** The season's rounds (tournament.json), for the bracket's shape. */
  rounds: RoundOutline[]
  /** Matchups already drawn, in order. */
  matchups: LedgerMatchup[]
  /** The matchup being drawn now, if any. */
  cursor?: BracketCursor
  /** Optional one-line note per matchup (the head-to-head tag, once the draw is complete). */
  tags?: string[]
}) {
  const slot = (round: number, i: number) => {
    if (round > 0) return <EmptySlot />
    const done = matchups[i]
    const live = cursor?.index === i && !done ? cursor : undefined
    return <OpeningSlot a={done?.a ?? live?.drawer} b={done?.b ?? live?.drawn} current={cursor?.index === i} tag={tags[i]} />
  }
  return <CupBracketOutline rounds={rounds} slot={slot} firstWidth="w-60" bleed={false} label="Cup bracket" />
}
