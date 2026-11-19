import { isSmallSample, oddsPct, type OddsCell, type RecordOddsRow, type RecordOddsTable as Table } from '@/selectors'
import { recordLabel } from '../format'
import { OddsHead, OddsValue, OddsWithCount, TeamList } from './OddsCells'
import { HEAD, ODDS, ROW_HEAD, TEAMS } from './styles'

/**
 * Historical playoff odds by record after N games, one row per record: the odds now, where a win
 * or a loss next week would move them, and this season's teams sitting at that record. Built so a
 * row answers "what is this week's game worth?" without reading across two tables.
 */

/** The odds after next week's result, and how far that moves them from now. */
function NextOdds({ cell, from, record }: { cell: OddsCell; from: OddsCell; record: string }) {
  const now = oddsPct(from)
  const next = oddsPct(cell)
  const move = now === undefined || next === undefined ? 0 : Math.round(next) - Math.round(now)
  const tone = isSmallSample(cell) ? '' : move > 0 ? 'text-positive' : 'text-negative'
  return (
    <span title={cell.teams > 0 ? `${cell.made} of ${cell.teams} teams at ${record} made it` : undefined}>
      <OddsValue cell={cell}>
        {move !== 0 && <span className={`ml-1.5 text-xs ${tone}`}>{move > 0 ? `+${move}` : `−${-move}`}</span>}
      </OddsValue>
    </span>
  )
}

function Row({ row, year, showTeams }: { row: RecordOddsRow; year: string; showTeams: boolean }) {
  const { wins, losses } = row.record
  return (
    <tr className="bg-surface">
      <th scope="row" className={ROW_HEAD}>
        {recordLabel(row.record)}
      </th>
      <td className={ODDS}>
        <OddsWithCount cell={row.now} />
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
        <td className={TEAMS}>
          <TeamList teams={row.current} year={year} />
        </td>
      )}
    </tr>
  )
}

export function RecordOddsTable({ table, year }: { table: Table; year: string }) {
  const next = table.rows[0]?.afterWin !== undefined
  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-accent text-accent-fg">
          <tr>
            <th scope="col" className={HEAD}>
              Record
            </th>
            <OddsHead label="Playoff odds" sub={`after game ${table.games}`} />
            {next && <OddsHead label="With a win" sub={`after game ${table.games + 1}`} />}
            {next && <OddsHead label="With a loss" sub={`after game ${table.games + 1}`} />}
            {table.currentPlayed && <OddsHead label={`${year} teams`} sub={`after game ${table.games}`} />}
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
