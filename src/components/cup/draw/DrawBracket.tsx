import type { ReactNode } from 'react'
import { CUP_ACCENT } from '@/config'
import type { RoundOutline } from '@/selectors'
import { bracketWings } from '../../bracketWings'
import type { MatchupSide } from './DrawMatchupCard'
import { BlankSlot, FeederSlot, OpeningSlot, type LedgerMatchup, type SlotSeeds } from './DrawBracketSlots'

export type { LedgerMatchup, SlotSeeds } from './DrawBracketSlots'

// The Cup bracket, filling in as the draw goes — drawn TWO-SIDED, the classic shape: the top half
// of the draw on the left, the bottom half mirrored on the right, the final in the middle. It halves
// the height of an 18-deep column (so it fits under the spinner on one screen) and shows at a
// glance that seeds 1 and 2 can only meet in the final.
//
// Slots are in seeded bracket order (bracketSlots); which side each sits on is bracketWings, the
// same rule as the Cup page's bracket. The Round of 18 names its feeders; later rounds stay blank
// because the quarterfinals re-seed after the lowest-winner drop.

/** Where the draw is: the matchup on the clock, and its opponent once revealed. */
export interface BracketCursor {
  index: number
  drawer: MatchupSide
  drawn: MatchupSide | undefined
}

// Columns stretch to fill the page (it is full-width on the call) but never below these, so a
// narrow window scrolls rather than squashing names. The opening round and the final carry names.
const WIDE = 'min-w-48 flex-[1.5]'
const NARROW = 'min-w-32 flex-1'

function Column({ round, width, children }: { round: RoundOutline | undefined; width: string; children: ReactNode }) {
  return (
    <section className={`flex ${width} flex-col`}>
      {/* Label over week, not side by side: a narrow column still fits "Quarterfinals" in full. */}
      <header className="mb-2 border-b-2 pb-1" style={{ borderColor: CUP_ACCENT }}>
        <h3 className="text-xs font-bold uppercase tracking-wide">{round?.label}</h3>
        <p className="text-[10px] font-semibold uppercase text-muted">Week {round?.week}</p>
      </header>
      <div className="flex flex-1 flex-col justify-around gap-2">{children}</div>
    </section>
  )
}

/** Who is in matchup `i` so far: both teams once drawn, the drawer (and the result, once in) if on the clock. */
function sidesOf(i: number, matchups: LedgerMatchup[], cursor: BracketCursor | undefined) {
  const done = matchups[i]
  if (done) return { a: done.a, b: done.b }
  if (cursor?.index === i) return { a: cursor.drawer, b: cursor.drawn }
  return { a: undefined, b: undefined }
}

const blanks = (n: number) => Array.from({ length: n }, (_, k) => <BlankSlot key={k} />)

export function DrawBracket({ rounds, order, seeds, matchups, cursor, tags = [], onOpen }: {
  /** The season's rounds (tournament.json): labels and weeks, opening round first. */
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
  /** Opens a drawn matchup (by draw-order index); without it the slots are plain. */
  onOpen?: (index: number) => void
}) {
  const [r36, r18, qf, sf, final] = rounds
  const opening = (position: number) => {
    const i = order[position]
    if (i === undefined) return <BlankSlot key={position} />
    return (
      <OpeningSlot
        key={position}
        position={position}
        {...sidesOf(i, matchups, cursor)}
        seeds={seeds[i]}
        current={cursor?.index === i}
        tag={tags[i]}
        // Only a matchup already drawn: the one on the clock may not have its opponent yet.
        onOpen={onOpen && matchups[i] ? () => onOpen(i) : undefined}
      />
    )
  }
  const feeder = (game: number) => {
    const from = [order[game * 2], order[game * 2 + 1]].map((i) => (i === undefined ? undefined : seeds[i]))
    return <FeederSlot key={game} from={from} />
  }

  /** One wing: its opening slots, Round-of-18 games, two quarterfinals and a semi. */
  const wing = (side: 0 | 1) => {
    const half = side === 0 ? 'left' : 'right'
    const openings = bracketWings(order.length)[half]
    const games = bracketWings(Math.ceil(order.length / 2))[half]
    const columns = [
      <Column key="r36" round={r36} width={WIDE}>{openings.map(opening)}</Column>,
      <Column key="r18" round={r18} width={NARROW}>{games.map(feeder)}</Column>,
      <Column key="qf" round={qf} width={NARROW}>{blanks(2)}</Column>,
      <Column key="sf" round={sf} width={NARROW}>{blanks(1)}</Column>,
    ]
    return side === 0 ? columns : columns.reverse()
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto pb-2">
        <div className="flex w-full min-w-[90rem] items-stretch gap-3" aria-label="Cup bracket">
          {wing(0)}
          <Column round={final} width={WIDE}>
            {blanks(1)}
          </Column>
          {wing(1)}
        </div>
      </div>
      <p className="text-center text-xs text-muted">
        The lowest-scoring {r18?.label ?? 'Round of 18'} winner is eliminated; the eight left are re-seeded for the{' '}
        {qf?.label.toLowerCase() ?? 'quarterfinals'}, so 1 and 2 can only meet in the final.
      </p>
    </div>
  )
}
