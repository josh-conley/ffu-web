import { CUP_ACCENT } from '@/config'
import type { RoundOutline } from '@/selectors'

// The bracket BEFORE the draw: the real shape, with empty slots where teams will go. Deliberately
// separate from TournamentBracket (which renders resolved matchups) — this one has no participants
// to render, and inventing placeholder "teams" to feed the real bracket would fake data the league
// does not have yet. Both take their shape from the same season rounds, so they cannot disagree.

/** One empty tie: two blank nameplates. */
function EmptySlot() {
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

function RoundColumn({ round }: { round: RoundOutline }) {
  return (
    <section className="flex w-44 shrink-0 flex-col">
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
          <EmptySlot key={i} />
        ))}
      </div>
    </section>
  )
}

/**
 * The undrawn bracket, one column per round, left → right. Full-bleed + horizontally scrollable,
 * matching the resolved bracket's layout so the page doesn't jump when the real one replaces it.
 */
export function CupBracketOutline({ rounds }: { rounds: RoundOutline[] }) {
  return (
    <div className="mx-[calc(50%-50vw+1rem)]">
      <div className="mx-auto w-fit max-w-full overflow-x-auto pb-4">
        <div className="flex min-w-max items-stretch gap-4 px-1" aria-label="Bracket outline — the draw has not been held">
          {rounds.map((round) => (
            <RoundColumn key={round.key} round={round} />
          ))}
        </div>
      </div>
    </div>
  )
}
