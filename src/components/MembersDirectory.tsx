import { useMemo } from 'react'
import { getMember, ownerNames } from '@/config'
import type { Tier } from '@/config'
import type { CareerStats, MembersByLeague } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'
import { TeamLogo } from './TeamLogo'

const TIER_ORDER: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

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

interface Title {
  year: string
  tier: Tier
}

/** The championships a member won (Premier → Masters → National, then by year), one per title. */
const championships = (c: CareerStats): Title[] =>
  c.finishes
    .filter((f) => f.finalPlacement === 1)
    .map((f) => ({ year: f.year, tier: f.tier }))
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.year.localeCompare(b.year))

/** Full summary like "Premier 2022, 2024 · National 2019" — for the group's accessible label. */
const trophyLabel = (titles: Title[]): string =>
  TIER_ORDER.filter((t) => titles.some((x) => x.tier === t))
    .map((t) => `${LEAGUE_STYLES[t].label} ${titles.filter((x) => x.tier === t).map((x) => x.year).join(', ')}`)
    .join(' · ')

/** One trophy per championship, colored by the league it was won in; hover shows the year won. */
function Trophies({ titles }: { titles: Title[] }) {
  if (titles.length === 0) return null
  return (
    <span className="flex shrink-0 items-center gap-0.5" aria-label={trophyLabel(titles)}>
      {titles.map((t, i) => (
        <span key={i} className={LEAGUE_STYLES[t.tier].text} title={t.year}>
          {TrophyIcon}
        </span>
      ))}
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
      <Trophies titles={championships(career)} />
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
      <Trophies titles={championships(career)} />
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
