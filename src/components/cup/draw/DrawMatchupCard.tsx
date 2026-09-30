import { CUP_ACCENT } from '@/config'
import type { CupTier } from '@/lib/cupDraw.mjs'
import type { DrawFacts } from '@/selectors'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'
import { DrawTeamFacts } from './DrawTeamFacts'

// The centre of the stage: who is drawing, and who they got.

export interface MatchupSide {
  ffuId: string
  name: string
  tier: CupTier
  seed: number
}

function Side({ side, facts, muted }: { side: MatchupSide; facts?: DrawFacts; muted?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${muted ? 'opacity-60' : ''}`}>
      <TeamLogo ffuId={side.ffuId} size={64} clickable={false} />
      <div className="min-w-0">
        <div className="truncate text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">{side.name}</div>
        <div className={`text-sm font-bold uppercase tracking-widest ${LEAGUE_STYLES[side.tier].text}`}>
          {LEAGUE_STYLES[side.tier].label} · seed {side.seed}
        </div>
        {facts && <DrawTeamFacts facts={facts} />}
      </div>
    </div>
  )
}

/** An empty plate while the bowl is still spinning. */
function Pending() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="size-16 shrink-0 animate-pulse bg-surface-2" aria-hidden />
      <span className="text-2xl font-extrabold uppercase tracking-widest text-muted sm:text-3xl">Drawing…</span>
    </div>
  )
}

export function DrawMatchupCard({ drawer, drawn, forced, facts }: {
  drawer: MatchupSide
  /** Undefined until the result is revealed. */
  drawn: MatchupSide | undefined
  /** Only one team was left to draw. */
  forced: boolean
  /** Talking points by ffuId; a team without an entry just shows its name and seed. */
  facts: Map<string, DrawFacts>
}) {
  // The matchup number lives in the top bar only — it used to appear three times on one screen.
  const label = !drawn ? 'On the clock' : forced ? 'Last team in the bowl' : 'Drawn'
  return (
    <div
      role="group"
      aria-label="Current matchup"
      className="border-2 bg-surface p-4 shadow-sm sm:p-6"
      style={{ borderColor: CUP_ACCENT }}
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: CUP_ACCENT }}>
        {label}
      </p>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
        <Side side={drawer} facts={facts.get(drawer.ffuId)} />
        <span className="shrink-0 self-center text-center text-sm font-extrabold uppercase tracking-widest text-muted">v</span>
        {drawn ? <Side side={drawn} facts={facts.get(drawn.ffuId)} /> : <Pending />}
      </div>
    </div>
  )
}
