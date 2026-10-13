import type { ReactNode } from 'react'
import { BETTER_TEXT, leaderOf, type Better } from './better'
import { COMPARE_FRAME, GroupRow, LABEL_COL } from './CompareRows'

// The season-and-career table: each member gets two columns, mirrored about the label, career on
// the outside and the season next to it (Career · Season | label | Season · Career). A row pits
// season against season and career against career, never across, so each scope has its own green.
// The season columns and the label are fixed widths; the career columns take the spare width, and
// their figures are aligned toward the centre, so they act as the spacers on a wide page.

/** One scope's figures for both sides. */
export interface ScopePair {
  a: ReactNode
  b: ReactNode
  /** The numbers behind the figures, to pick the better one; none means no contest. */
  values?: readonly [number, number]
}

const SCOPE_COLUMNS = 5

/**
 * The season columns are tinted: a block either side of the label, the comparison read first.
 * (Not the career ones: as the flexible columns, they would turn into wide bands.)
 */
const SEASON_TINT = 'bg-surface-2/50'
const SCOPE_COL = 'w-[20%] sm:w-28'
const PAD = 'px-0.5 py-2 sm:px-3'

function Cell({ pair, side, better, season }: { pair: ScopePair | undefined; side: 'a' | 'b'; better: Better; season: boolean }) {
  const lead = pair?.values ? leaderOf(pair.values, better) : undefined
  return (
    <td className={`${PAD} ${side === 'a' ? 'text-right' : 'text-left'} ${season ? SEASON_TINT : ''}`}>
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
      <Cell pair={career} side="a" better={better} season={false} />
      <Cell pair={season} side="a" better={better} season />
      <th scope="row" title={title} className="px-0.5 py-2 text-center sm:px-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-muted sm:text-[11px]">
        {label}
      </th>
      <Cell pair={season} side="b" better={better} season />
      <Cell pair={career} side="b" better={better} season={false} />
    </tr>
  )
}

export function ScopeGroupRow({ label }: { label: string }) {
  return <GroupRow label={label} span={SCOPE_COLUMNS} />
}

/** The frame: each side's short name over its two columns, then which column is which. */
export function ScopeTable({ aLabel, bLabel, year, caption, children }: { aLabel: string; bLabel: string; year: string; caption: string; children: ReactNode }) {
  const scope = 'px-0.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted sm:px-3'
  return (
    // Below ~20.5rem (a phone under 360px) the table scrolls rather than let a career total like
    // 14,088.00 spill out of its column.
    <div className={`${COMPARE_FRAME} overflow-x-auto`}>
      <table className="w-full min-w-[20.5rem] table-fixed text-[11px] sm:text-sm">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col />
          <col className={SCOPE_COL} />
          <col className={LABEL_COL} />
          <col className={SCOPE_COL} />
          <col />
        </colgroup>
        <thead>
          <tr className="text-xs font-bold uppercase tracking-wider">
            <th scope="colgroup" colSpan={2} className="px-0.5 pt-2 pb-1 text-right sm:px-3">{aLabel}</th>
            <td />
            <th scope="colgroup" colSpan={2} className="px-0.5 pt-2 pb-1 text-left sm:px-3">{bLabel}</th>
          </tr>
          <tr>
            <th scope="col" className={`${scope} text-right`}>Career</th>
            <th scope="col" className={`${scope} text-right ${SEASON_TINT}`}>{year}</th>
            <td />
            <th scope="col" className={`${scope} text-left ${SEASON_TINT}`}>{year}</th>
            <th scope="col" className={`${scope} text-left`}>Career</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
