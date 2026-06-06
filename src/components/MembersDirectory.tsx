import { useMemo } from 'react'
import { getMember, ownerNames } from '@/config'
import type { CareerStats, MembersByLeague } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'
import { TeamLogo } from './TeamLogo'

const TrophyIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
)

/** A championship is one trophy; cap the icons and append "×N" past the cap to keep cards tidy. */
function Trophies({ count }: { count: number }) {
  if (count <= 0) return null
  const shown = Math.min(count, 4)
  return (
    <span
      className="flex shrink-0 items-center gap-0.5 text-amber-500 dark:text-amber-400"
      title={`${count} championship${count === 1 ? '' : 's'}`}
      aria-label={`${count} championship${count === 1 ? '' : 's'}`}
    >
      {Array.from({ length: shown }, (_, i) => (
        <span key={i}>{TrophyIcon}</span>
      ))}
      {count > shown && <span className="text-xs font-bold">×{count}</span>}
    </span>
  )
}

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
      <Trophies count={career.championships} />
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
      <Trophies count={career.championships} />
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
