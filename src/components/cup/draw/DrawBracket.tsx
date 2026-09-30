import { CUP_ACCENT } from '@/config'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'
import type { MatchupSide } from './DrawMatchupCard'

// The Round of 36 filling in as the draw goes: every slot is on screen from the start, empty until
// its matchup is drawn, so anyone joining the call part-way sees the whole draw so far at a glance.
//
// Only the Round of 36 is shown. It is the one round the draw decides; how its winners pair up
// in the Round of 18 is not ruled on yet (the engine's adjacent pairing is a placeholder), and
// drawing connectors into later rounds would put an unconfirmed rule on screen.

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

/** Premier draws matchups 1–12; the undrawn Masters teams draw 13–18. */
const GROUPS = [
  { label: 'Premier draws', from: 0, to: 12 },
  { label: 'Masters draws', from: 12, to: 18 },
] as const

function Row({ side }: { side: MatchupSide | undefined }) {
  if (!side) {
    return (
      <div className="flex h-7 items-center gap-2 pl-1.5">
        <span className="size-5 shrink-0 rounded-full bg-surface-2" aria-hidden />
        <span className="text-sm font-bold text-muted">?</span>
      </div>
    )
  }
  return (
    <div className="flex h-7 items-center gap-2 pl-1.5">
      <span className={`size-2 shrink-0 rounded-full ${LEAGUE_STYLES[side.tier].dot}`} aria-hidden />
      <TeamLogo ffuId={side.ffuId} size={20} clickable={false} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{side.name}</span>
      <span className="shrink-0 pr-1 font-mono text-xs tabular-nums text-muted">{side.seed}</span>
    </div>
  )
}

function Slot({ n, a, b, current, tag }: {
  n: number
  a: MatchupSide | undefined
  b: MatchupSide | undefined
  current: boolean
  tag: string | undefined
}) {
  const empty = !a
  return (
    <li
      aria-current={current ? 'step' : undefined}
      className={`flex items-stretch border bg-surface ${empty ? 'border-dashed border-border' : 'border-border'}`}
      // A ring, not a thicker border: the slot must not change size as the cursor moves.
      style={current ? { boxShadow: `0 0 0 3px ${CUP_ACCENT}` } : undefined}
    >
      <span
        className="flex w-7 shrink-0 items-center justify-center border-r border-border font-mono text-xs font-bold tabular-nums"
        style={current ? { color: CUP_ACCENT } : undefined}
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 py-1">
        {empty ? (
          <div className="flex h-14 items-center pl-2 text-xs uppercase tracking-widest text-muted/60">To be drawn</div>
        ) : (
          <>
            <Row side={a} />
            <Row side={b} />
          </>
        )}
        {tag && <p className="px-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">{tag}</p>}
      </div>
    </li>
  )
}

export function DrawBracket({ matchups, cursor, tags = [] }: {
  /** Matchups already drawn, in order. */
  matchups: LedgerMatchup[]
  /** The matchup being drawn now, if any. */
  cursor?: BracketCursor
  /** Optional one-line note per matchup (the head-to-head tag, once the draw is complete). */
  tags?: string[]
}) {
  const slot = (i: number) => {
    const done = matchups[i]
    const live = cursor?.index === i && !done ? cursor : undefined
    return (
      <Slot
        key={i}
        n={i + 1}
        a={done?.a ?? live?.drawer}
        b={done?.b ?? live?.drawn}
        current={cursor?.index === i}
        tag={tags[i]}
      />
    )
  }
  return (
    <div className="space-y-4" aria-label="Round of 36">
      {GROUPS.map((g) => (
        <section key={g.label} className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted">{g.label}</h2>
          <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: g.to - g.from }, (_, k) => slot(g.from + k))}
          </ol>
        </section>
      ))}
    </div>
  )
}
