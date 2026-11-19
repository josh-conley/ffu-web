import { nameForYear, PLAYOFF_FIELD } from '@/config'
import type { CurrentTeam, OddsCell, OddsGroup, OddsRow, OddsTable } from '@/selectors'
import { recordLabel } from './format'
import { LEAGUE_STYLES } from './leagues'
import { RecapPanel } from './recap/RecapPanel'

/**
 * One game count's historical playoff odds by record, as a capturable FFUN block: the pooled odds,
 * then each season length on its own (so the 13-game ESPN years can be read apart from the 14-game
 * ones), then this season's teams at each record.
 */

const CELL = 'border border-border px-3 py-1.5'
// No wrapping in the headers or the odds: the team list is the column that soaks up the width, and
// left to auto layout it squeezes every other column down to one word per line.
const HEAD = 'border border-text px-3 py-2 whitespace-nowrap text-center text-xs font-bold'
const ODDS = `${CELL} whitespace-nowrap text-center font-mono tabular-nums`

/** "2021–25", or a single year when the group is one season. */
const yearSpan = (g: { firstYear: string; lastYear: string }) =>
  g.firstYear === g.lastYear ? g.firstYear : `${g.firstYear}–${g.lastYear.slice(2)}`

function Odds({ cell }: { cell: OddsCell }) {
  if (cell.teams === 0) return <span className="text-muted">—</span>
  return (
    <>
      <span className="font-bold">{Math.round((100 * cell.made) / cell.teams)}%</span>{' '}
      <span className="text-xs text-muted">
        {cell.made}/{cell.teams}
      </span>
    </>
  )
}

function Teams({ teams, year }: { teams: CurrentTeam[]; year: string }) {
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

function Row({ row, year, showTeams }: { row: OddsRow; year: string; showTeams: boolean }) {
  return (
    <tr className="bg-surface">
      <th scope="row" className={`${CELL} whitespace-nowrap text-center font-mono font-bold tabular-nums`}>
        {recordLabel(row.record)}
      </th>
      <td className={ODDS}>
        <Odds cell={row.all} />
      </td>
      {row.byGroup.map((cell, i) => (
        <td key={i} className={ODDS}>
          <Odds cell={cell} />
        </td>
      ))}
      {showTeams && (
        <td className={`${CELL} w-full text-left`}>
          <Teams teams={row.current} year={year} />
        </td>
      )}
    </tr>
  )
}

function GroupHead({ group, games }: { group: OddsGroup; games: number }) {
  const left = group.seasonLength - games
  return (
    <th scope="col" className={HEAD}>
      {yearSpan(group)}
      <span className="block font-normal opacity-80">
        {group.seasonLength} games · {left === 0 ? 'final' : `${left} left`}
      </span>
    </th>
  )
}

export function PlayoffOddsTable({
  table,
  year,
  title,
  meta,
  copyFilename,
}: {
  table: OddsTable
  /** The current season, whose team names the last column shows. */
  year: string
  title: string
  meta?: string
  copyFilename?: string
}) {
  const span = table.groups.length > 0 ? yearSpan({ firstYear: table.groups.at(-1)!.firstYear, lastYear: table.groups[0]!.lastYear }) : ''
  return (
    <RecapPanel title={title} meta={meta} compact copyFilename={copyFilename}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-text text-bg">
              <th scope="col" className={HEAD}>Record</th>
              <th scope="col" className={HEAD}>
                All seasons
                <span className="block font-normal opacity-80">{span}</span>
              </th>
              {table.groups.map((g) => (
                <GroupHead key={g.seasonLength} group={g} games={table.games} />
              ))}
              {table.currentPlayed && <th scope="col" className={HEAD}>{year} teams</th>}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <Row key={recordLabel(row.record)} row={row} year={year} showTeams={table.currentPlayed} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-3 py-2 text-xs text-muted">
        Share of teams at each record after {table.games} games that made the {PLAYOFF_FIELD.teams}-team playoff field.
        {table.groups.length > 1 && ' Shorter seasons are also shown on their own: they had fewer games left at the same record.'}
      </p>
    </RecapPanel>
  )
}
