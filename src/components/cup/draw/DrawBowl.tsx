import { CUP_ACCENT } from '@/config'
import type { CupTier, DrawTeam } from '@/lib/cupDraw.mjs'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'

// The bowl: every team still to be drawn, and the stage for the reveal ("last crest standing" —
// crests go out one by one until only the drawn team is lit). Built for a Discord screen share:
// big crests, tier colour, the quota rule made VISIBLE (it's the part people find confusing when
// it is only written down), and every change a large, discrete one that survives compression.
// Nothing here changes size mid-reveal: the highlight is a box-shadow ring, not a border.

export interface BowlTeam extends DrawTeam {
  tier: CupTier
}

/** A league that has given up its six teams — closed for the rest of Premier's draw. */
function ClosedStamp({ tier }: { tier: CupTier }) {
  return (
    <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 -rotate-6 border-y-2 border-negative bg-bg/85 py-1 text-center text-sm font-extrabold uppercase tracking-widest text-negative">
      {LEAGUE_STYLES[tier].label} full
    </span>
  )
}

type CrestState = 'lit' | 'out' | 'closed' | 'standing'

const CREST_LOOK: Record<CrestState, string> = {
  lit: '',
  out: 'opacity-15 grayscale',
  closed: 'opacity-25',
  standing: 'bg-surface-2',
}

function Crest({ team, state }: { team: BowlTeam; state: CrestState }) {
  return (
    <div
      data-state={state}
      className={`flex flex-col items-center gap-1 border border-border px-3 py-2 transition-[opacity,filter] duration-300 ${CREST_LOOK[state]}`}
      style={state === 'standing' ? { boxShadow: `0 0 0 4px ${CUP_ACCENT}` } : undefined}
    >
      <TeamLogo ffuId={team.ffuId} size={48} clickable={false} />
      {/* The full name, wrapping as needed: a truncated name is unreadable on a stream. */}
      <span className="min-h-[2lh] w-full text-center text-sm font-bold leading-tight [overflow-wrap:anywhere]">{team.name}</span>
      <span className={`text-[11px] font-extrabold uppercase tracking-widest ${LEAGUE_STYLES[team.tier].text}`}>
        {LEAGUE_STYLES[team.tier].label}
      </span>
    </div>
  )
}

/** One league's half of the bowl. */
function Half({ tier, teams, closed, knockedOut, standing }: {
  tier: CupTier
  teams: BowlTeam[]
  closed: boolean
  knockedOut: Set<string>
  standing: string | undefined
}) {
  const stateOf = (id: string): CrestState =>
    id === standing ? 'standing' : closed ? 'closed' : knockedOut.has(id) ? 'out' : 'lit'
  return (
    <section className="relative flex-1">
      <h3 className={`mb-2 text-sm font-bold uppercase tracking-widest ${LEAGUE_STYLES[tier].text}`}>
        {LEAGUE_STYLES[tier].label} · {teams.length} left
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
        {teams.map((t) => (
          <Crest key={t.ffuId} team={t} state={stateOf(t.ffuId)} />
        ))}
      </div>
      {closed && teams.length > 0 && <ClosedStamp tier={tier} />}
    </section>
  )
}

export function DrawBowl({ masters, national, mastersClosed, nationalClosed, knockedOut, standing }: {
  masters: BowlTeam[]
  national: BowlTeam[]
  mastersClosed: boolean
  nationalClosed: boolean
  /** Crests out of this matchup's draw so far. */
  knockedOut: Set<string>
  /** The drawn crest, once it's the last one standing. */
  standing: string | undefined
}) {
  const shared = { knockedOut, standing }
  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <Half tier="MASTERS" teams={masters} closed={mastersClosed} {...shared} />
      <Half tier="NATIONAL" teams={national} closed={nationalClosed} {...shared} />
    </div>
  )
}
