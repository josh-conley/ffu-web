import { UPR_RANGE, type UprOddsTable as Table, type UprRangeRow } from '@/selectors'
import { OddsHead, OddsWithCount, TeamList } from './OddsCells'
import { HEAD, ODDS, ROW_HEAD, TEAMS } from './styles'

/**
 * Historical playoff odds by UPR after N games, one row per 10-point range: the odds, and this
 * season's teams rated in that range. No win or loss columns: a UPR moves by an amount that depends
 * on the score, not just the result, so there is no single "next" range to point at.
 */

/** "150–159" (a 159.99 rating is in it), or the open rows at either end: "Over 179", "Under 90". */
function rangeLabel(row: UprRangeRow): string {
  if (row.open === 'above') return `Over ${row.floor - 1}`
  if (row.open === 'below') return `Under ${row.floor + UPR_RANGE}`
  return `${row.floor}–${row.floor + UPR_RANGE - 1}`
}

export function UprOddsTable({ table, year }: { table: Table; year: string }) {
  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-accent text-accent-fg">
          <tr>
            <th scope="col" className={HEAD}>
              UPR
            </th>
            <OddsHead label="Playoff odds" sub={`after game ${table.games}`} />
            {table.currentPlayed && <OddsHead label={`${year} teams`} sub={`UPR after game ${table.games}`} />}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.floor} className="bg-surface">
              <th scope="row" className={ROW_HEAD}>
                {rangeLabel(row)}
              </th>
              <td className={ODDS}>
                <OddsWithCount cell={row.odds} />
              </td>
              {table.currentPlayed && (
                <td className={TEAMS}>
                  <TeamList teams={row.current} year={year} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
