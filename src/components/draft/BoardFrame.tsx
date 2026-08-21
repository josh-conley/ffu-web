import type { ReactNode } from 'react'
import type { LeagueStyle } from '../leagues'

/**
 * The draft board's chrome, shared by the completed board (DraftBoard) and the pre-draft order
 * board (DraftOrderBoard): a tier-themed bordered tile that breaks out to near-full width, a tier
 * color top rule, and a fixed-layout table that scrolls horizontally with the round rail pinned
 * left. Extracted so the two boards can never drift apart visually (Charter DRY).
 */
export function BoardFrame({ tier, slots, head, body }: {
  tier: LeagueStyle
  /** Slot numbers, left → right — one <col> each, after the round rail. */
  slots: number[]
  head: ReactNode
  body: ReactNode
}) {
  return (
    <div className="mx-[calc(50%-50vw+1rem)] border border-border bg-surface shadow-sm">
      <div className={`h-1.5 ${tier.dot}`} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-6 sm:w-10" />
            {slots.map((slot) => (
              <col key={slot} />
            ))}
          </colgroup>
          <thead>{head}</thead>
          <tbody>{body}</tbody>
        </table>
      </div>
    </div>
  )
}

/** The board's top-left corner cell ("Rd"), pinned left on horizontal scroll. */
export function RoundRailCorner() {
  return (
    <th className="sticky left-0 z-10 border-r border-border bg-surface-2 px-0.5 py-1 text-center text-[9px] font-bold uppercase tracking-wider text-muted sm:px-1">
      Rd
    </th>
  )
}
