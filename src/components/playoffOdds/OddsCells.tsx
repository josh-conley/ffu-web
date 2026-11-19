import type { ReactNode } from 'react'
import { nameForYear } from '@/config'
import { isSmallSample, oddsPct, type CurrentTeam, type OddsCell } from '@/selectors'
import { LEAGUE_STYLES } from '../leagues'
import { HEAD } from './styles'

// The cells both Playoff Odds tables are built from.

const pctLabel = (pct: number) => `${Math.round(pct)}%`

/** A percentage in bold, then an aside; grey when it rests on too few teams. */
export function OddsValue({ cell, children }: { cell: OddsCell; children?: ReactNode }) {
  const pct = oddsPct(cell)
  if (pct === undefined) return <span className="text-muted">—</span>
  return (
    <span className={isSmallSample(cell) ? 'text-muted' : undefined}>
      <span className="font-bold">{pctLabel(pct)}</span>
      {children}
    </span>
  )
}

/** The odds, with the count behind them. */
export function OddsWithCount({ cell }: { cell: OddsCell }) {
  return (
    <OddsValue cell={cell}>
      {' '}
      <span className="text-xs text-muted">
        {cell.made}/{cell.teams}
      </span>
    </OddsValue>
  )
}

/** This season's teams, each with its league color, and its UPR when the table is by UPR. */
export function TeamList({ teams, year }: { teams: CurrentTeam[]; year: string }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
      {teams.map((t) => (
        <li key={t.memberId} className="flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden className={`h-3 w-1 ${LEAGUE_STYLES[t.tier].dot}`} />
          <span>{nameForYear(t.memberId, year) ?? t.memberId}</span>
          <span className="sr-only">({LEAGUE_STYLES[t.tier].label})</span>
          {t.upr !== undefined && <span className="font-mono text-xs text-muted tabular-nums">{t.upr.toFixed(1)}</span>}
        </li>
      ))}
    </ul>
  )
}

/** A column header with a smaller second line. */
export function OddsHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <th scope="col" className={HEAD}>
      {label}
      {sub !== undefined && <span className="block font-normal opacity-80">{sub}</span>}
    </th>
  )
}
