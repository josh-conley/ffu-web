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

/** The odds now, with the count behind them. */
function NowOdds({ cell }: { cell: OddsCell }) {
  const pct = oddsPct(cell)
  if (pct === undefined) return <span className="text-muted">—</span>
  return (
    <span className={isSmall(cell) ? 'text-muted' : undefined}>
      <span className="font-bold">{pctLabel(pct)}</span>{' '}
      <span className="text-xs text-muted">
        {cell.made}/{cell.teams}
      </span>
    </span>
  )
}

/** The odds after next week's result, and how far that moves them from now. */
function NextOdds({ cell, from, record }: { cell: OddsCell; from: OddsCell; record: string }) {
  const pct = oddsPct(cell)
  if (pct === undefined) return <span className="text-muted">—</span>
  const base = oddsPct(from)
  const move = base === undefined ? undefined : Math.round(pct) - Math.round(base)
  return (
    <span className={isSmall(cell) ? 'text-muted' : undefined} title={`${cell.made} of ${cell.teams} teams at ${record} made it`}>
      <span className="font-bold">{pctLabel(pct)}</span>
      {move !== undefined && move !== 0 && (
        <span className={`ml-1.5 text-xs ${isSmall(cell) ? '' : move > 0 ? 'text-positive' : 'text-negative'}`}>
          {move > 0 ? `+${move}` : `−${-move}`}
        </span>
      )}
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
