import { Fragment, type ReactNode } from 'react'
import { bracketWings } from './bracketWings'

// The Cup's bracket frame, drawn TWO-SIDED like the draw stage: the top half of the bracket on the
// left, the bottom half mirrored on the right, the final in the middle. It halves the height of an
// 18-deep column and shows at a glance that seeds 1 and 2 can only meet in the final. One frame for
// every Cup bracket (the outline before the draw, the played bracket, a pick'em bracket); what goes
// in each slot is the caller's. Which matchup sits on which side is bracketWings.

export interface BracketColumn {
  key: string
  label: string
  week: number
  /** The round's matchups, in bracket order, already drawn. */
  slots: ReactNode[]
}

function Column({ label, week, top, wide, children }: { label: string; week: number; top?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    // Columns share the width (the frame is full-bleed) but never go below their minimum, so a
    // narrow window scrolls sideways rather than squashing names.
    <section className={`flex ${wide ? 'min-w-52' : 'min-w-40'} flex-1 flex-col`}>
      {/* Label over week, not side by side: a narrow column still fits "Quarterfinals" in full. */}
      <header className="mb-3 border-b-2 border-accent pb-1">
        <h2 className="text-xs font-bold uppercase tracking-wide text-text">{label}</h2>
        <p className="text-[10px] font-semibold uppercase text-muted">Week {week}</p>
      </header>
      {top}
      <div className="flex flex-1 flex-col justify-around gap-2">{children}</div>
    </section>
  )
}

/** A matchup nobody is in yet: two blank nameplates. */
export function EmptySlot() {
  return (
    <div className="space-y-1 border border-dashed border-border bg-surface p-2" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-1.5 pl-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-border" />
          <span className="h-4 flex-1 bg-surface-2" />
        </div>
      ))}
    </div>
  )
}

export function WingedBracket({ rounds, center, label }: {
  /** Every round, opening round first; the last is the final, drawn in the middle. */
  rounds: BracketColumn[]
  /** Notes for the whole bracket, over the final: the lowest-winner drop, which no one side owns. */
  center?: ReactNode
  /** Accessible name for the bracket. */
  label?: string
}) {
  const final = rounds[rounds.length - 1]
  const wing = (side: 'left' | 'right') =>
    rounds.slice(0, -1).map((r) => (
      <Column key={`${side}-${r.key}`} label={r.label} week={r.week}>
        {bracketWings(r.slots.length)[side].map((i) => <Fragment key={i}>{r.slots[i]}</Fragment>)}
      </Column>
    ))

  return (
    // Full-bleed: out of the page's centered max-width, so the bracket gets the whole window.
    <div className="mx-[calc(50%-50vw+1rem)] overflow-x-auto pb-4">
      <div className="flex w-full items-stretch gap-2" aria-label={label}>
        {wing('left')}
        {final && (
          <Column label={final.label} week={final.week} top={center} wide>
            {final.slots.map((slot, i) => <Fragment key={i}>{slot}</Fragment>)}
          </Column>
        )}
        {wing('right').reverse()}
      </div>
    </div>
  )
}
