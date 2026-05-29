import { nameForYear } from '@/config'
import type { StandingRow } from '@/selectors'
import { TeamLogo } from './TeamLogo'

function recordLabel(row: StandingRow): string {
  const { wins, losses, ties } = row.team.record
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`
}

const TH = 'px-3 py-2.5 text-left font-bold uppercase tracking-wider text-accent-fg'
const TD = 'px-3 py-2 whitespace-nowrap'

export function StandingsTable({ rows, upr, year }: { rows: StandingRow[]; upr: Map<string, number>; year: string }) {
  return (
    <div className="overflow-x-auto border border-border bg-surface shadow-sm">
      {/* w-max so columns keep their natural width and the box scrolls on narrow screens
          instead of squishing; min-w-full still fills the container on desktop. */}
      <table className="w-max min-w-full text-sm">
        <thead className="bg-accent">
          <tr>
            <th scope="col" className={TH}>#</th>
            <th scope="col" className={TH}>Team</th>
            <th scope="col" className={TH}>Record</th>
            <th scope="col" className={`${TH} text-right`} title="Points For">PF</th>
            <th scope="col" className={`${TH} text-right`} title="Points Against">PA</th>
            <th scope="col" className={`${TH} text-right`}>Win%</th>
            <th scope="col" className={`${TH} text-right`} title="Union Power Ranking">UPR</th>
            <th scope="col" className={TH}>Finish</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const { team } = row
            return (
              <tr key={team.memberId} className="hover:bg-surface-2">
                <td className={`${TD} tabular-nums text-muted`}>{row.rank}</td>
                <td className={TD}>
                  <span className="flex items-center gap-2">
                    <TeamLogo ffuId={team.memberId} />
                    <span className="font-semibold">{nameForYear(team.memberId, year) ?? team.memberId}</span>
                    {team.promoted && <span title="Promoted" aria-label="Promoted" className="text-emerald-600 dark:text-emerald-400">▲</span>}
                    {team.relegated && <span title="Relegated" aria-label="Relegated" className="text-national">▼</span>}
                  </span>
                </td>
                <td className={`${TD} tabular-nums`}>{recordLabel(row)}</td>
                <td className={`${TD} text-right tabular-nums`}>{team.points.for.toFixed(2)}</td>
                <td className={`${TD} text-right tabular-nums`}>{team.points.against.toFixed(2)}</td>
                <td className={`${TD} text-right tabular-nums`}>{(row.winPct * 100).toFixed(1)}%</td>
                <td className={`${TD} text-right font-mono tabular-nums`}>{upr.get(team.memberId)?.toFixed(2) ?? '—'}</td>
                <td className={`${TD} text-muted`}>{team.placementName ?? team.finalPlacement ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
