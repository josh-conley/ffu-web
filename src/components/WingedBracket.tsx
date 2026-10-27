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
  /** Its week is being played: the header says so. */
  live?: boolean
  /** The round's matchups, in bracket order, already drawn. */
  slots: ReactNode[]
}

function Column({ label, week, live, top, wide, children }: { label: string; week: number; live?: boolean; top?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    // Columns share the width (the frame is full-bleed) but never go below their minimum, so a
    // narrow window scrolls sideways rather than squashing names.
    <section className={`flex ${wide ? 'min-w-44' : 'min-w-36'} flex-1 flex-col`}>
      {/* Label over week, not side by side: a narrow column still fits "Quarterfinals" in full. */}
      <header className="mb-3 border-b-2 border-accent pb-1">
        <h2 className="text-xs font-bold uppercase tracking-wide text-text">{label}</h2>
        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted">
          Week {week}
          {live && (
            <>
              <span aria-hidden className="ml-0.5 size-1.5 rounded-full bg-positive motion-safe:animate-pulse" />
              <span className="text-positive">Live</span>
            </>
          )}
        </p>
      </header>
      {/* `top` floats over the column instead of taking space in it, so the column stays level with
          its mirror on the other wing. */}
      <div className="relative flex flex-1 flex-col justify-around gap-2">
        {top && <div className="absolute inset-x-0 top-0">{top}</div>}
        {children}
      </div>
    </section>
  )
}

/** A matchup nobody is in yet: two blank nameplates. */
export function EmptySlot() {
  return (
    <div className="space-y-0.5 border border-dashed border-border bg-surface p-1" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-1 py-px pl-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
          <span className="h-3.5 flex-1 bg-surface-2" />
        </div>
      ))}
    </div>
  )
}

/** A note on what happens between two rounds (the lowest-winner drop), keyed by the round it follows. */
export interface BetweenRounds {
  after: string
  content: ReactNode
}

export function WingedBracket({ rounds, between = [], label }: {
  /** Every round, opening round first; the last is the final, drawn in the middle. */
  rounds: BracketColumn[]
  /** Drawn over the LEFT wing's next round, where it reads first: e.g. the Round of 18's drop sits
   *  over the quarterfinals it shapes. Not over the final, where it read as part of the final. */
  between?: BetweenRounds[]
  /** Accessible name for the bracket. */
  label?: string
}) {
  const final = rounds[rounds.length - 1]
  const noteOver = (r: number) => {
    const notes = between.filter((b) => b.after === rounds[r - 1]?.key)
    return notes.length > 0 ? notes.map((b) => <Fragment key={b.after}>{b.content}</Fragment>) : undefined
  }
  const wing = (side: 'left' | 'right') =>
    rounds.slice(0, -1).map((r, ri) => (
      <Column key={`${side}-${r.key}`} label={r.label} week={r.week} live={r.live} top={side === 'left' ? noteOver(ri) : undefined}>
        {bracketWings(r.slots.length)[side].map((i) => <Fragment key={i}>{r.slots[i]}</Fragment>)}
      </Column>
    ))

  return (
    // Full-bleed: out of the page's centered max-width, so the bracket gets the whole window.
    <div className="mx-[calc(50%-50vw+1rem)] overflow-x-auto pb-4">
      <div className="flex w-full items-stretch gap-2" aria-label={label}>
        {wing('left')}
        {final && (
          <Column label={final.label} week={final.week} live={final.live} wide>
            {final.slots.map((slot, i) => <Fragment key={i}>{slot}</Fragment>)}
          </Column>
        )}
        {wing('right').reverse()}
      </div>
    </div>
  )
}
