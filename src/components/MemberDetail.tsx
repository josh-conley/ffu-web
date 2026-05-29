import { getMember, ownerNames } from '@/config'
import type { CareerStats, MemberSeason } from '@/selectors'
import { TeamLogo } from './TeamLogo'
import { LeagueBadge } from './LeagueBadge'

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
  return (
    <div className="overflow-x-auto border border-border bg-surface shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-accent">
          <tr>
            <th className={TH}>Year</th>
            <th className={TH}>Tier</th>
            <th className={`${TH} text-right`}>Record</th>
            <th className={`${TH} text-right`}>PF</th>
            <th className={`${TH} text-right`}>PA</th>
            <th className={TH}>Finish</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(({ year, tier, team }) => (
            <tr key={`${year}-${tier}`} className="hover:bg-surface-2">
              <td className={TD}>{year}</td>
              <td className="px-3 py-2"><LeagueBadge tier={tier} /></td>
              <td className={`${TD} text-right`}>{team.record.wins}-{team.record.losses}{team.record.ties > 0 ? `-${team.record.ties}` : ''}</td>
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

export function MemberDetail({ career, history }: { career: CareerStats; history: MemberSeason[] }) {
  const member = getMember(career.memberId)
  const owners = ownerNames(career.memberId)
  const tenure = career.firstYear === null ? '' : `${career.firstYear}–${career.lastYear} · ${career.seasons} seasons`

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <TeamLogo ffuId={career.memberId} size={48} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{member?.name ?? career.memberId}</h1>
            {career.isActive && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">Active</span>}
          </div>
          <div className="text-sm text-muted">
            {owners.length > 0 ? owners.join(' / ') : 'Owner TBD'}
            {tenure && ` · ${tenure}`}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Championships" value={career.championships} />
        <Stat label="Runner-ups" value={career.runnerUps} />
        <Stat label="Best Finish" value={career.bestFinish ?? '—'} />
        <Stat label="Playoff Apps" value={career.playoffAppearances} />
        <Stat label="Record" value={`${career.wins}-${career.losses}${career.ties > 0 ? `-${career.ties}` : ''}`} />
        <Stat label="Win %" value={`${(career.winPct * 100).toFixed(1)}%`} />
        <Stat label="Points For" value={career.pointsFor.toFixed(1)} />
        <Stat label="Points Against" value={career.pointsAgainst.toFixed(1)} />
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-text">
          <span className="inline-block h-4 w-1 bg-accent" aria-hidden />
          Season History
        </h2>
        <SeasonHistory rows={history} />
      </section>
    </div>
  )
}
