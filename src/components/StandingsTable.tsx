import { nameForYear } from '@/config'
import type { StandingRow } from '@/selectors'
import { TeamLogo } from './TeamLogo'

function recordLabel(row: StandingRow): string {
  const { wins, losses, ties } = row.team.record
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`
}

const TH = 'px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400'
const TD = 'px-3 py-2 whitespace-nowrap'

export function StandingsTable({ rows, upr, year }: { rows: StandingRow[]; upr: Map<string, number>; year: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            <th className={TH}>#</th>
            <th className={TH}>Team</th>
            <th className={TH}>Record</th>
            <th className={`${TH} text-right`}>PF</th>
            <th className={`${TH} text-right`}>PA</th>
            <th className={`${TH} text-right`}>Win%</th>
            <th className={`${TH} text-right`}>UPR</th>
            <th className={TH}>Finish</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => {
            const { team } = row
            return (
              <tr key={team.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className={`${TD} tabular-nums text-slate-500`}>{row.rank}</td>
                <td className={TD}>
                  <span className="flex items-center gap-2">
                    <TeamLogo ffuId={team.memberId} />
                    <span className="font-medium">{nameForYear(team.memberId, year) ?? team.memberId}</span>
                    {team.promoted && <span title="Promoted" className="text-emerald-600 dark:text-emerald-400">▲</span>}
                    {team.relegated && <span title="Relegated" className="text-red-600 dark:text-red-400">▼</span>}
                  </span>
                </td>
                <td className={`${TD} tabular-nums`}>{recordLabel(row)}</td>
                <td className={`${TD} text-right tabular-nums`}>{team.points.for.toFixed(2)}</td>
                <td className={`${TD} text-right tabular-nums`}>{team.points.against.toFixed(2)}</td>
                <td className={`${TD} text-right tabular-nums`}>{(row.winPct * 100).toFixed(1)}%</td>
                <td className={`${TD} text-right tabular-nums`}>{upr.get(team.memberId)?.toFixed(2) ?? '—'}</td>
                <td className={`${TD} text-slate-500`}>{team.placementName ?? team.finalPlacement ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
