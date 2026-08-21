import { CUP_ACCENT } from '@/config'
import type { CupTier, DrawTeam } from '@/lib/cupDraw.mjs'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'

// The bowl: every team still to be drawn. Built for a stream — big crests, tier colour, and the
// quota rule made VISIBLE, because "six from one league and the pool closes" is the part people
// find confusing when it is only written down.

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

function Crest({ team, spotlit, dimmed }: { team: BowlTeam; spotlit: boolean; dimmed: boolean }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 border p-2 transition-all duration-100 ${dimmed ? 'opacity-25' : ''}`}
      style={spotlit ? { borderColor: CUP_ACCENT, backgroundColor: `${CUP_ACCENT}26`, transform: 'scale(1.08)' } : { borderColor: 'var(--color-border)' }}
    >
      <TeamLogo ffuId={team.ffuId} size={40} />
      <span className="w-full truncate text-center text-[11px] font-bold leading-tight">{team.name}</span>
      <span className={`text-[9px] font-extrabold uppercase tracking-widest ${LEAGUE_STYLES[team.tier].text}`}>
        {LEAGUE_STYLES[team.tier].label}
      </span>
    </div>
  )
}

/** One league's half of the bowl. */
function Half({ tier, teams, spotlitId, closed }: { tier: CupTier; teams: BowlTeam[]; spotlitId: string | null; closed: boolean }) {
  return (
    <section className="relative flex-1">
      <h3 className={`mb-2 text-xs font-bold uppercase tracking-widest ${LEAGUE_STYLES[tier].text}`}>
        {LEAGUE_STYLES[tier].label} · {teams.length} left
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((t) => (
          <Crest key={t.ffuId} team={t} spotlit={t.ffuId === spotlitId} dimmed={closed} />
        ))}
      </div>
      {closed && teams.length > 0 && <ClosedStamp tier={tier} />}
    </section>
  )
}

export function DrawBowl({ masters, national, spotlitId, mastersClosed, nationalClosed }: {
  masters: BowlTeam[]
  national: BowlTeam[]
  /** The crest currently lit by the spinner — cosmetic only; the result is already decided. */
  spotlitId: string | null
  mastersClosed: boolean
  nationalClosed: boolean
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <Half tier="MASTERS" teams={masters} spotlitId={spotlitId} closed={mastersClosed} />
      <Half tier="NATIONAL" teams={national} spotlitId={spotlitId} closed={nationalClosed} />
    </div>
  )
}
