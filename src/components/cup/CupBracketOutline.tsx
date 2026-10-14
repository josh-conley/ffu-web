import type { RoundOutline } from '@/selectors'
import { EmptySlot, WingedBracket } from '../WingedBracket'

// The bracket BEFORE the draw: the real shape, with empty slots where teams will go. Deliberately
// separate from TournamentBracket (which renders resolved matchups) — this one has no participants
// to render, and inventing placeholder "teams" to feed the real bracket would fake data the league
// does not have yet. Both take their shape from the same season rounds and draw it in the same
// two-sided frame, so the page doesn't jump when the real bracket replaces this one.

export function CupBracketOutline({ rounds }: { rounds: RoundOutline[] }) {
  const drop = rounds.find((r) => r.dropped > 0)
  return (
    <WingedBracket
      label="Bracket outline — the draw has not been held"
      rounds={rounds.map((r) => ({ key: r.key, label: r.label, week: r.week, slots: Array.from({ length: r.matchups }, (_, i) => <EmptySlot key={i} />) }))}
      center={
        drop && (
          <p className="mb-2 border-l-2 border-national pl-2 text-[11px] leading-tight text-muted">
            The lowest-scoring {drop.label} winner is eliminated.
          </p>
        )
      }
    />
  )
}
