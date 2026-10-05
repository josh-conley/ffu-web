import { nameForYear } from '@/config'
import type { UprTableRow } from '@/selectors'
import { recordLabel } from '../format'
import { LEAGUE_STYLES } from '../leagues'
import { RecapPanel } from './RecapPanel'

/**
 * The FFUN's Union Power Rating page: all 36 teams by UPR in two side-by-side tables of 18, each
 * with its move since last week. Same columns as the newsletter's hand-built table, so the capture
 * drops straight into that page.
 */

const CELL = 'border border-border px-2 py-1.5'

/** "+3" / "-2" / "0"; a dash on the first rated week, which has nothing to move from. */
function Move({ move }: { move: number | undefined }) {
  if (move === undefined) return <span className="text-muted">—</span>
  if (move === 0) return <span className="text-muted">0</span>
  return <span className={move > 0 ? 'text-positive' : 'text-negative'}>{move > 0 ? `+${move}` : move}</span>
}

function Row({ row, year }: { row: UprTableRow; year: string }) {
  const style = LEAGUE_STYLES[row.tier]
  return (
    <tr className="bg-surface">
      <td className={`${CELL} text-center font-mono font-bold tabular-nums`}>
        <Move move={row.move} />
      </td>
      <td className={`${CELL} truncate text-center`}>{nameForYear(row.memberId, year) ?? row.memberId}</td>
      <td className={`${CELL} text-center font-bold ${style.solidHeader}`}>
        <abbr title={style.label} className="no-underline">
          {style.label[0]}
        </abbr>
      </td>
      <td className={`${CELL} text-center font-mono tabular-nums`}>{row.upr.toFixed(1)}</td>
      <td className={`${CELL} text-center font-mono tabular-nums`}>{recordLabel(row.record)}</td>
    </tr>
  )
}

function Half({ rows, year, label }: { rows: UprTableRow[]; year: string; label: string }) {
  return (
    <table className="w-full table-fixed border-collapse text-sm" aria-label={label}>
      <colgroup>
        <col className="w-12" />
        <col />
        <col className="w-16" />
        <col className="w-16" />
        <col className="w-14" />
      </colgroup>
      <thead>
        <tr className="bg-text text-bg">
          {['+ / -', 'Team Name', 'League', 'UPR', 'W-L'].map((h) => (
            <th key={h} scope="col" className={`${CELL} border-text text-center text-xs font-bold`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Row key={row.memberId} row={row} year={year} />
        ))}
      </tbody>
    </table>
  )
}

export function WeekUprTable({
  rows,
  year,
  week,
  compact,
  copyFilename,
}: {
  rows: UprTableRow[]
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  // Nothing to rate until the season has enough weeks (see UPR_MIN_WEEKS).
  if (rows.length === 0) return null
  const split = Math.ceil(rows.length / 2)
  return (
    <RecapPanel
      title="Union Power Rating"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <Half rows={rows.slice(0, split)} year={year} label={`UPR table, teams 1–${split}`} />
        <Half rows={rows.slice(split)} year={year} label={`UPR table, teams ${split + 1}–${rows.length}`} />
      </div>
      <p className="border-t border-border px-3 py-2 text-center text-xs font-bold">
        UPR = (Average Score × 6 + (High Game + Low Game) × 2 + Win Percentage × 400) / 10
      </p>
    </RecapPanel>
  )
}
