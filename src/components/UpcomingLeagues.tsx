import { FaArrowDown, FaArrowRotateLeft, FaArrowUp, FaStar } from 'react-icons/fa6'
import type { IconType } from 'react-icons'
import { nameForYear } from '@/config'
import type { Movement, UpcomingRoster, UpcomingTeam } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'
import { TeamLogo } from './TeamLogo'

/**
 * Next season's signups, one card per tier: who's in, and how they got there (promoted / relegated
 * / returning / new) versus the last completed season. Movement itself is derived in the
 * `upcomingRosters` selector — this file only decides how each label looks.
 */

interface MovementStyle {
  label: string
  icon: IconType
  className: string
  /** Sort weight — movers and newcomers surface above the members who simply stayed put. */
  rank: number
}

const MOVEMENT_STYLES: Record<Exclude<Movement, 'stayed'>, MovementStyle> = {
  promoted: { label: 'Promoted', icon: FaArrowUp, className: 'text-positive', rank: 0 },
  relegated: { label: 'Relegated', icon: FaArrowDown, className: 'text-negative', rank: 1 },
  new: { label: 'New', icon: FaStar, className: 'text-notable', rank: 2 },
  returning: { label: 'Returning', icon: FaArrowRotateLeft, className: 'text-muted', rank: 3 },
}

const STAYED_RANK = 4
const styleOf = (m: Movement) => (m === 'stayed' ? undefined : MOVEMENT_STYLES[m])
const rankOf = (m: Movement) => styleOf(m)?.rank ?? STAYED_RANK
const teamName = (team: UpcomingTeam, year: string) => nameForYear(team.memberId, year) ?? team.memberId

/** The right-hand tag on a member's row. Members who stayed in their league get no tag (no noise). */
function MovementTag({ team }: { team: UpcomingTeam }) {
  const style = styleOf(team.movement)
  if (!style) return null
  const Icon = style.icon
  const from = team.fromTier ? `${LEAGUE_STYLES[team.fromTier].label} ${team.fromYear ?? ''}`.trim() : undefined
  return (
    <span
      className={`ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wide ${style.className}`}
      title={from ? `${style.label} from ${from}` : style.label}
    >
      <Icon size={10} aria-hidden />
      {style.label}
    </span>
  )
}

function TeamRow({ team, year }: { team: UpcomingTeam; year: string }) {
  return (
    <li className="flex items-center gap-2 border-t border-border px-3 py-2 first:border-t-0">
      <TeamLogo ffuId={team.memberId} size={24} />
      <span className="truncate text-sm font-semibold">{teamName(team, year)}</span>
      <MovementTag team={team} />
    </li>
  )
}

/** Trailing notes: seats still to be filled, plus any manager Sleeper reports who isn't in the
 *  registry yet. "Pending" rather than "open": the commissioner has these spots spoken for. */
function RosterFooter({ roster }: { roster: UpcomingRoster }) {
  const notes: string[] = []
  if (roster.openSlots > 0) notes.push(`${roster.openSlots} pending member${roster.openSlots === 1 ? '' : 's'}`)
  if (roster.unregistered > 0) notes.push(`${roster.unregistered} manager${roster.unregistered === 1 ? '' : 's'} not listed yet`)
  if (notes.length === 0) return null
  return <p className="border-t border-border px-3 py-2 text-xs text-muted">{notes.join(' · ')}</p>
}

function RosterCard({ roster }: { roster: UpcomingRoster }) {
  const style = LEAGUE_STYLES[roster.tier]
  const filled = roster.teams.length + roster.unregistered
  const size = filled + roster.openSlots
  const teams = [...roster.teams].sort(
    (a, b) => rankOf(a.movement) - rankOf(b.movement) || teamName(a, roster.year).localeCompare(teamName(b, roster.year)),
  )
  return (
    <div className="border border-border bg-surface shadow-sm">
      <h3 className={`flex items-center justify-between px-3 py-2 text-sm font-bold uppercase tracking-wide ${style.solidHeader}`}>
        {style.label}
        <span className="tabular-nums text-xs">
          {filled}/{size}
        </span>
      </h3>
      <ul>
        {teams.map((team) => (
          <TeamRow key={team.memberId} team={team} year={roster.year} />
        ))}
      </ul>
      <RosterFooter roster={roster} />
    </div>
  )
}

export function UpcomingLeagues({ year, rosters }: { year: string; rosters: UpcomingRoster[] }) {
  if (rosters.length === 0) return null
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted">{year} Leagues</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rosters.map((roster) => (
          <RosterCard key={roster.tier} roster={roster} />
        ))}
      </div>
    </section>
  )
}
