import type { ReactNode } from 'react'
import { BETTER_TEXT, leaderOf, type Better } from './better'
import { COMPARE_FRAME, GroupRow } from './CompareRows'

// The season-and-career table: each member gets two columns, mirrored about the label, career on
// the outside and the season next to it (Career · Season | label | Season · Career). A row pits
// season against season and career against career, never across, so each scope has its own green.

/** One scope's figures for both sides. */
export interface ScopePair {
  a: ReactNode
  b: ReactNode
  /** The numbers behind the figures, to pick the better one; none means no contest. */
  values?: readonly [number, number]
}

const SCOPE_COLUMNS = 5

/** The career columns are tinted, so the eye keeps the two scopes apart down a long table. */
const CAREER_TINT = 'bg-surface-2/50'
const PAD = 'px-1 py-2 sm:px-3'

function Cell({ pair, side, better, career }: { pair: ScopePair | undefined; side: 'a' | 'b'; better: Better; career: boolean }) {
  const lead = pair?.values ? leaderOf(pair.values, better) : undefined
  return (
    <td className={`${PAD} ${side === 'a' ? 'text-right' : 'text-left'} ${career ? CAREER_TINT : ''}`}>
      {pair && <span className={`font-mono tabular-nums ${lead === side ? BETTER_TEXT : ''}`}>{pair[side]}</span>}
    </td>
  )
}

/** One figure in both scopes; a scope left out (the season's league, say) leaves its cells blank. */
export function ScopeRow({ label, title, season, career, better = 'high' }: {
  label: string
  /** Hover text for the label: what the figure means. */
  title?: string
  season?: ScopePair
  career?: ScopePair
  better?: Better
}) {
  return (
    <tr className="border-t border-border">
      <Cell pair={career} side="a" better={better} career />
      <Cell pair={season} side="a" better={better} career={false} />
      <th scope="row" title={title} className="px-1 py-2 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-muted sm:text-[11px]">
        {label}
      </th>
      <Cell pair={season} side="b" better={better} career={false} />
      <Cell pair={career} side="b" better={better} career />
    </tr>
  )
}

export function ScopeGroupRow({ label }: { label: string }) {
  return <GroupRow label={label} span={SCOPE_COLUMNS} />
}

/**
 * The frame: each side's short name over its two columns, then which column is which. Capped and
 * centred under the nameplates: stretched across a desktop page, four figure columns drift so far
 * apart that a row stops reading as one line.
 */
export function ScopeTable({ aLabel, bLabel, year, caption, children }: { aLabel: string; bLabel: string; year: string; caption: string; children: ReactNode }) {
  const scope = 'px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted sm:px-3'
  return (
    // Below ~22rem (a small phone, in the modal) the table scrolls rather than let a career total
    // like 14,088.00 spill out of its column.
    <div className={`${COMPARE_FRAME} overflow-x-auto`}>
      <table className="w-full min-w-[22rem] table-fixed text-[11px] sm:text-sm">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[20%]" />
          <col />
          <col className="w-[20%]" />
          <col className="w-[20%]" />
        </colgroup>
        <thead>
          <tr className="text-xs font-bold uppercase tracking-wider">
            <th scope="colgroup" colSpan={2} className="px-1 pt-2 pb-1 text-right sm:px-3">{aLabel}</th>
            <td />
            <th scope="colgroup" colSpan={2} className="px-1 pt-2 pb-1 text-left sm:px-3">{bLabel}</th>
          </tr>
          <tr>
            <th scope="col" className={`${scope} text-right ${CAREER_TINT}`}>Career</th>
            <th scope="col" className={`${scope} text-right`}>{year}</th>
            <td />
            <th scope="col" className={`${scope} text-left`}>{year}</th>
            <th scope="col" className={`${scope} text-left ${CAREER_TINT}`}>Career</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
