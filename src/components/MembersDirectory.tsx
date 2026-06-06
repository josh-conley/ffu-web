import { useMemo } from 'react'
import { getMember, ownerNames } from '@/config'
import { championshipTitles, type CareerStats, type MembersByLeague } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'
import { Trophies } from './Trophies'
import { TeamLogo } from './TeamLogo'

const teamName = (c: CareerStats) => getMember(c.memberId)?.name ?? c.memberId
const byTeamName = (a: CareerStats, b: CareerStats) => teamName(a).localeCompare(teamName(b))

function MemberCard({ career, onSelect }: { career: CareerStats; onSelect: (id: string) => void }) {
  const owners = ownerNames(career.memberId).join(' / ')
  return (
    <button
      type="button"
      onClick={() => onSelect(career.memberId)}
      className="flex items-center gap-3 border border-border bg-surface p-3 text-left shadow-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <TeamLogo ffuId={career.memberId} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{teamName(career)}</div>
        <div className="truncate text-sm text-muted">{owners || '—'}</div>
      </div>
      <Trophies titles={championshipTitles(career)} />
    </button>
  )
}

function PastRow({ career, onSelect }: { career: CareerStats; onSelect: (id: string) => void }) {
  const owners = ownerNames(career.memberId).join(' / ')
  return (
    <button
      type="button"
      onClick={() => onSelect(career.memberId)}
      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <TeamLogo ffuId={career.memberId} size={24} />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{teamName(career)}</span>
        {owners && <span className="text-muted"> · {owners}</span>}
      </span>
      <Trophies titles={championshipTitles(career)} />
    </button>
  )
}

export function MembersDirectory({ groups, onSelect }: { groups: MembersByLeague; onSelect: (ffuId: string) => void }) {
  const past = useMemo(() => [...groups.past].sort(byTeamName), [groups.past])

  return (
    <div className="space-y-8">
      {groups.current.map(({ tier, members }) => (
        <section key={tier} className="space-y-3">
          <h2 className={`px-3 py-2 text-sm font-bold uppercase tracking-wide ${LEAGUE_STYLES[tier].solidHeader}`}>
            {LEAGUE_STYLES[tier].label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...members].sort(byTeamName).map((c) => (
              <MemberCard key={c.memberId} career={c} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Past Members</h2>
          <div className="divide-y divide-border border border-border bg-surface shadow-sm">
            {past.map((c) => (
              <PastRow key={c.memberId} career={c} onSelect={onSelect} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
