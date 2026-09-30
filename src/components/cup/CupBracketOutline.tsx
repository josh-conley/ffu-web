import type { ReactNode } from 'react'
import { CUP_ACCENT } from '@/config'
import type { RoundOutline } from '@/selectors'

// The bracket BEFORE the draw: the real shape, with empty slots where teams will go. Deliberately
// separate from TournamentBracket (which renders resolved matchups) — this one has no participants
// to render, and inventing placeholder "teams" to feed the real bracket would fake data the league
// does not have yet. Both take their shape from the same season rounds, so they cannot disagree.

/** One empty matchup: two blank nameplates. */
export function EmptySlot() {
  return (
    <div className="space-y-1 border border-dashed border-border bg-surface p-2">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-1.5 border-l-2 border-transparent pl-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-border" aria-hidden />
          <span className="h-4 flex-1 bg-surface-2" aria-hidden />
        </div>
      ))}
    </div>
  )
}

/** Renders one slot: `round` is the column (0 = the opening round), `index` the matchup within it. */
export type SlotRenderer = (round: number, index: number) => ReactNode

function RoundColumn({ round, column, slot, width }: { round: RoundOutline; column: number; slot: SlotRenderer; width: string }) {
  return (
    <section className={`flex ${width} shrink-0 flex-col`}>
      <header className="mb-3 flex items-baseline justify-between border-b-2 pb-1" style={{ borderColor: CUP_ACCENT }}>
        <h3 className="text-xs font-bold uppercase tracking-wide">{round.label}</h3>
        <span className="text-[10px] font-semibold uppercase text-muted">Wk {round.week}</span>
      </header>
      {round.dropped > 0 && (
        <p className="mb-2 border-l-2 border-national pl-2 text-[11px] leading-tight text-muted">
          Lowest winner of this round is eliminated here.
        </p>
      )}
      <div className="flex flex-1 flex-col justify-around gap-3">
        {Array.from({ length: round.matchups }, (_, i) => (
          <div key={i}>{slot(column, i)}</div>
        ))}
      </div>
    </section>
  )
}

const emptySlots: SlotRenderer = () => <EmptySlot />

/**
 * The bracket's shape, one column per round, left → right, later rounds centred against earlier
 * ones. Undrawn it is all empty slots; the live draw passes `slot` to fill the opening round as
 * matchups are drawn, so the draw page and /cup show the same bracket. Full-bleed and
 * horizontally scrollable by default, matching the resolved bracket's layout so /cup doesn't jump
 * when the real one replaces it; `bleed={false}` keeps it inside its own column.
 */
export function CupBracketOutline({ rounds, slot = emptySlots, firstWidth = 'w-44', bleed = true, label }: {
  rounds: RoundOutline[]
  slot?: SlotRenderer
  /** Width class for the opening round's column, which carries team names once drawn. */
  firstWidth?: string
  bleed?: boolean
  label?: string
}) {
  return (
    <div className={bleed ? 'mx-[calc(50%-50vw+1rem)]' : undefined}>
      <div className="mx-auto w-fit max-w-full overflow-x-auto pb-4">
        <div className="flex min-w-max items-stretch gap-4 px-1" aria-label={label ?? 'Bracket outline — the draw has not been held'}>
          {rounds.map((round, column) => (
            <RoundColumn key={round.key} round={round} column={column} slot={slot} width={column === 0 ? firstWidth : 'w-44'} />
          ))}
        </div>
      </div>
    </div>
  )
}
