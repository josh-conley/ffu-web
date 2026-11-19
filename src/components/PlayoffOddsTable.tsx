import type { ReactNode } from 'react'
import { nameForYear } from '@/config'
import { oddsPct, SMALL_SAMPLE, type CurrentTeam, type OddsCell, type RecordOddsRow, type RecordOddsTable } from '@/selectors'
import { recordLabel } from './format'
import { LEAGUE_STYLES } from './leagues'

/**
 * Historical playoff odds by record after N games, one row per record: the odds now, where a win
 * or a loss next week would move them, and this season's teams sitting at that record. Built so a
 * row answers "what is this week's game worth?" without reading across two tables.
 */

const CELL = 'border border-border px-3 py-1.5'
// No wrapping in the headers or the odds: the team list is the column that soaks up the width.
const HEAD = 'border border-border px-3 py-2 whitespace-nowrap text-center text-xs font-bold'
const ODDS = `${CELL} whitespace-nowrap text-center font-mono tabular-nums`

const isSmall = (cell: OddsCell) => cell.teams > 0 && cell.teams < SMALL_SAMPLE
const pctLabel = (pct: number) => `${Math.round(pct)}%`

/**
 * Every odds cell is the same two lines with fixed slots, so the percentages line up across a row
 * and down a column: a small caption line on top (the record a win or loss leads to, blank for the
 * odds now), then the percentage right-aligned in a "100%"-wide slot with its aside (count or move)
 * in a fixed slot after it. Without the slots a 3-digit aside or a missing move nudges the centred
 * percentage sideways.
 */
function OddsSlots({ caption, pct, aside, muted }: { caption?: string; pct: ReactNode; aside?: ReactNode; muted: boolean }) {
  return (
    <span className={`inline-flex flex-col items-center ${muted ? 'text-muted' : ''}`}>
      <span className="text-[11px] leading-tight text-muted" aria-hidden={caption === undefined}>
        {caption ?? ' '}
      </span>
      <span className="inline-flex items-baseline">
        <span className="w-[4ch] text-right font-bold">{pct}</span>
        <span className="ml-1.5 w-[5ch] text-left text-xs">{aside}</span>
      </span>
    </span>
  )
}

/** The odds now, with the count behind them. */
function NowOdds({ cell }: { cell: OddsCell }) {
  const pct = oddsPct(cell)
  if (pct === undefined) return <OddsSlots pct={<span className="font-normal text-muted">—</span>} muted={false} />
  const count = (
    <span className="text-muted">
      {cell.made}/{cell.teams}
    </span>
  )
  return <OddsSlots pct={pctLabel(pct)} aside={count} muted={isSmall(cell)} />
}

/** The odds after next week's result, the record it leads to, and how far it moves them from now. */
function NextOdds({ cell, from, record }: { cell: OddsCell; from: OddsCell; record: string }) {
  const pct = oddsPct(cell)
  if (pct === undefined) return <OddsSlots caption={record} pct={<span className="font-normal text-muted">—</span>} muted={false} />
  const base = oddsPct(from)
  const move = base === undefined ? 0 : Math.round(pct) - Math.round(base)
  const tone = isSmall(cell) ? '' : move > 0 ? 'text-positive' : 'text-negative'
  const aside = move === 0 ? undefined : <span className={tone}>{move > 0 ? `+${move}` : `−${-move}`}</span>
  return (
    <span title={`${cell.made} of ${cell.teams} teams at ${record} made it`}>
      <OddsSlots caption={record} pct={pctLabel(pct)} aside={aside} muted={isSmall(cell)} />
    </span>
  )
}

export function TeamList({ teams, year }: { teams: CurrentTeam[]; year: string }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
      {teams.map((t) => (
        <li key={t.memberId} className="flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden className={`h-3 w-1 ${LEAGUE_STYLES[t.tier].dot}`} />
          <span>{nameForYear(t.memberId, year) ?? t.memberId}</span>
          <span className="sr-only">({LEAGUE_STYLES[t.tier].label})</span>
        </li>
      ))}
    </ul>
  )
}

function Row({ row, year, showTeams }: { row: RecordOddsRow; year: string; showTeams: boolean }) {
  const { wins, losses } = row.record
  return (
    <tr className="bg-surface">
      <th scope="row" className={`${CELL} whitespace-nowrap text-center font-mono font-bold tabular-nums`}>
        {recordLabel(row.record)}
      </th>
      <td className={ODDS}>
        <NowOdds cell={row.now} />
      </td>
      {row.afterWin !== undefined && (
        <td className={ODDS}>
          <NextOdds cell={row.afterWin} from={row.now} record={`${wins + 1}-${losses}`} />
        </td>
      )}
      {row.afterLoss !== undefined && (
        <td className={ODDS}>
          <NextOdds cell={row.afterLoss} from={row.now} record={`${wins}-${losses + 1}`} />
        </td>
      )}
      {showTeams && (
        <td className={`${CELL} w-full text-left`}>
          <TeamList teams={row.current} year={year} />
        </td>
      )}
    </tr>
  )
}

function Head({ label, sub }: { label: string; sub: string }) {
  return (
    <th scope="col" className={HEAD}>
      {label}
      <span className="block font-normal opacity-80">{sub}</span>
    </th>
  )
}

export function PlayoffOddsTable({ table, year }: { table: RecordOddsTable; year: string }) {
  const next = table.rows[0]?.afterWin !== undefined
  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-accent text-accent-fg">
          <tr>
            <th scope="col" className={HEAD}>
              Record
            </th>
            <Head label="Playoff odds" sub={`after game ${table.games}`} />
            {next && <Head label="With a win" sub={`after game ${table.games + 1}`} />}
            {next && <Head label="With a loss" sub={`after game ${table.games + 1}`} />}
            {table.currentPlayed && <Head label={`${year} teams`} sub={`after game ${table.games}`} />}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <Row key={recordLabel(row.record)} row={row} year={year} showTeams={table.currentPlayed} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
