import type { CareerStats, MemberSeason } from '@/selectors'
import { LeagueBadge } from '../LeagueBadge'
import { TrophyCase } from '../TrophyCase'
import { formatPoints, recordLabel } from '../format'
import { MemberSection } from './MemberSection'

/** One cell of the career strip; `wide` spans both columns on a phone (see CareerSection). */
function Stat({ label, value, wide = false }: { label: string; value: string | number; wide?: boolean }) {
  return (
    <div className={`bg-surface-2 px-3 py-2 ${wide ? 'col-span-2' : ''}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-mono text-base font-bold tabular-nums text-text">{value}</dd>
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
              <td className={`${TD} text-right`}>{formatPoints(team.points.for)}</td>
              <td className={`${TD} text-right`}>{formatPoints(team.points.against)}</td>
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
        {/* Seven numbers as one dense strip. Record spans two cells so the seven fill 2 columns on a
            phone (1 + 3 rows of 2) and 4 from sm up (2 rows of 4) with no orphan cell; PF and PA sit
            side by side at every width. Three columns would cramp the grouped point totals at 390px. */}
        <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          <Stat label="Record" value={recordLabel(career)} wide />
          <Stat label="Win %" value={`${(career.winPct * 100).toFixed(1)}%`} />
          <Stat label="Playoff Apps" value={career.playoffAppearances} />
          <Stat label="Avg Finish" value={career.averageSeasonRank?.toFixed(1) ?? '—'} />
          <Stat label="Winnings" value={`$${winnings.toLocaleString('en-US')}`} />
          <Stat label="Points For" value={formatPoints(career.pointsFor)} />
          <Stat label="Points Against" value={formatPoints(career.pointsAgainst)} />
        </dl>
        <TrophyCase career={career} />
        <SeasonHistory rows={history} />
      </div>
    </MemberSection>
  )
}
