import type { ReactNode } from 'react'
import type { CareerStats } from '@/selectors'
import { HARDWARE, type HardwareKind } from '../hardware'
import { LEAGUE_STYLES } from '../leagues'

// The rows every part of the Compare view is built from: one figure per member either side of a
// centred label, the better one in green. The same convention as the old Compare table, so a
// glance down either column still reads as "who's ahead where".

/** Which way is better: more (wins), fewer (average finish), or neither (seasons played). */
export type Better = 'high' | 'low' | 'none'

export const BETTER_TEXT = 'font-bold text-positive'

function leaderOf([a, b]: readonly [number, number], better: Better): 'a' | 'b' | undefined {
  if (better === 'none' || a === b) return undefined
  return (better === 'high' ? a > b : a < b) ? 'a' : 'b'
}

/** A thin track under a figure, filled toward the centre in proportion to the larger of the two. */
function Bar({ share, lead, side }: { share: number; lead: boolean; side: 'a' | 'b' }) {
  return (
    <span className="mt-1 block h-1 w-full bg-surface-2" aria-hidden>
      <span
        className={`block h-full ${lead ? 'bg-positive' : 'bg-muted/40'} ${side === 'a' ? 'ml-auto' : ''}`}
        style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }}
      />
    </span>
  )
}

/** A group's heading inside a compare table. */
export function GroupRow({ label }: { label: string }) {
  return (
    <tr>
      <th scope="colgroup" colSpan={3} className="bg-surface-2 px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}
      </th>
    </tr>
  )
}

export function StatRow({ label, title, a, b, values, better = 'high', bar = false, extra }: {
  label: string
  /** Hover text for the label: what the figure means. */
  title?: string
  /** Each side's figure, formatted. */
  a: ReactNode
  b: ReactNode
  /** The numbers behind the figures, to pick the better one (and size the bars). */
  values?: readonly [number, number]
  better?: Better
  /** Draw a proportion bar under each figure. Only for figures that are never negative. */
  bar?: boolean
  /** Something to show under each figure (e.g. the leagues of their playoff trips). */
  extra?: readonly [ReactNode, ReactNode]
}) {
  const lead = values ? leaderOf(values, better) : undefined
  const max = values ? Math.max(values[0], values[1]) : 0
  const cell = (side: 'a' | 'b', figure: ReactNode, value: number | undefined, under: ReactNode) => (
    <td className={`px-3 py-2 ${side === 'a' ? 'text-right' : 'text-left'}`}>
      <span className={`font-mono tabular-nums ${lead === side ? BETTER_TEXT : ''}`}>{figure}</span>
      {under && <span className={`mt-0.5 flex ${side === 'a' ? 'justify-end' : ''}`}>{under}</span>}
      {bar && value !== undefined && max > 0 && <Bar share={value / max} lead={lead === side} side={side} />}
    </td>
  )
  return (
    <tr className="border-t border-border">
      {cell('a', a, values?.[0], extra?.[0])}
      <th scope="row" title={title} className="px-1 py-2 text-center text-[11px] font-bold uppercase leading-tight tracking-wide text-muted">
        {label}
      </th>
      {cell('b', b, values?.[1], extra?.[1])}
    </tr>
  )
}

/** One tier-colored icon per qualifying season (league and year on hover), then the count. */
function Icons({ career, kind, side, lead }: { career: CareerStats; kind: HardwareKind; side: 'a' | 'b'; lead: boolean }) {
  const { icon: Icon, label, match } = HARDWARE[kind]
  const hits = career.finishes.filter(match).sort((x, y) => x.year.localeCompare(y.year))
  const count = <span className={`font-mono tabular-nums ${lead ? BETTER_TEXT : hits.length === 0 ? 'text-muted' : ''}`}>{hits.length}</span>
  const icons = hits.map((f) => (
    <span key={`${f.year}-${f.tier}`} className={LEAGUE_STYLES[f.tier].text} title={`${LEAGUE_STYLES[f.tier].label} ${label} · ${f.year}`}>
      <Icon size={14} aria-hidden />
    </span>
  ))
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${side === 'a' ? 'flex-row-reverse' : ''}`}>
      {count}
      {icons}
    </span>
  )
}

/** A hardware row: each side's trophies (or pennants, or toilets) as icons in their league's color. */
export function HardwareRow({ label, kind, a, b, better = 'high' }: { label: string; kind: HardwareKind; a: CareerStats; b: CareerStats; better?: Better }) {
  const count = (c: CareerStats) => c.finishes.filter(HARDWARE[kind].match).length
  const lead = leaderOf([count(a), count(b)], better)
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-right"><Icons career={a} kind={kind} side="a" lead={lead === 'a'} /></td>
      <th scope="row" className="px-1 py-2 text-center text-[11px] font-bold uppercase leading-tight tracking-wide text-muted">{label}</th>
      <td className="px-3 py-2 text-left"><Icons career={b} kind={kind} side="b" lead={lead === 'b'} /></td>
    </tr>
  )
}

/** The compare table's frame, headed by each side's short name so a long table stays readable. */
export function CompareTable({ aLabel, bLabel, caption, children }: { aLabel: string; bLabel: string; caption: string; children: ReactNode }) {
  return (
    <div className="border border-border bg-surface shadow-sm">
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[42%]" />
          <col />
          <col className="w-[42%]" />
        </colgroup>
        <thead>
          <tr className="text-xs font-bold uppercase tracking-wider">
            <th scope="col" className="px-3 py-2 text-right">{aLabel}</th>
            <td />
            <th scope="col" className="px-3 py-2 text-left">{bLabel}</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
