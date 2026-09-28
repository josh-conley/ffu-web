import type { CareerStats, MemberSeason } from '@/selectors'
import { LeagueBadge } from '../LeagueBadge'
import { TrophyCase } from '../TrophyCase'
import { recordLabel } from '../format'
import { MemberSection } from './MemberSection'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="angular-sm decal border-t-[3px] border-t-accent bg-surface-2 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold tabular-nums text-text">{value}</div>
    </div>
  )
}

function SeasonHistory({ rows }: { rows: MemberSeason[] }) {
  const TH = 'px-3 py-2.5 text-left font-bold uppercase tracking-wider text-accent-fg'
  const TD = 'px-3 py-2 tabular-nums'
  const newestFirst = [...rows].sort((a, b) => Number(b.year) - Number(a.year))
  return (
    <div className="overflow-x-auto border border-border bg-surface shadow-sm">
      <table className="w-max min-w-full text-sm">
        <thead className="bg-accent">
          <tr>
            <th scope="col" className={TH}>Year</th>
            <th scope="col" className={TH}>Tier</th>
            <th scope="col" className={`${TH} text-right`}>Record</th>
            <th scope="col" className={`${TH} text-right`} title="Points For">PF</th>
            <th scope="col" className={`${TH} text-right`} title="Points Against">PA</th>
            <th scope="col" className={TH}>Finish</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {newestFirst.map(({ year, tier, team }) => (
            <tr key={`${year}-${tier}`} className="hover:bg-surface-2">
              <td className={TD}>{year}</td>
              <td className="px-3 py-2"><LeagueBadge tier={tier} /></td>
              <td className={`${TD} text-right`}>{recordLabel(team.record)}</td>
              <td className={`${TD} text-right`}>{team.points.for.toFixed(2)}</td>
              <td className={`${TD} text-right`}>{team.points.against.toFixed(2)}</td>
              <td className="px-3 py-2 text-muted">{team.placementName ?? team.finalPlacement ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Career: the headline numbers, the trophy case, and every season on file. */
export function CareerSection({ career, history, winnings }: { career: CareerStats; history: MemberSeason[]; winnings: number }) {
  return (
    <MemberSection title="Career">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Record" value={recordLabel(career)} />
          <Stat label="Win %" value={`${(career.winPct * 100).toFixed(1)}%`} />
          <Stat label="Playoff Apps" value={career.playoffAppearances} />
          <Stat label="Avg Finish" value={career.averageSeasonRank?.toFixed(1) ?? '—'} />
          <Stat label="Points For" value={career.pointsFor.toFixed(2)} />
          <Stat label="Points Against" value={career.pointsAgainst.toFixed(2)} />
          <Stat label="Winnings" value={`$${winnings.toLocaleString('en-US')}`} />
        </div>
        <TrophyCase career={career} />
        <SeasonHistory rows={history} />
      </div>
    </MemberSection>
  )
}
