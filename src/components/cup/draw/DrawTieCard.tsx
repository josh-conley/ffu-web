import { CUP_ACCENT } from '@/config'
import type { CupTier } from '@/lib/cupDraw.mjs'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'

// The centre of the stage: who is drawing, and who they got.

export interface TieSide {
  ffuId: string
  name: string
  tier: CupTier
  seed: number
}

function Side({ side, muted }: { side: TieSide; muted?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${muted ? 'opacity-60' : ''}`}>
      <TeamLogo ffuId={side.ffuId} size={56} />
      <div className="min-w-0">
        <div className="truncate text-xl font-extrabold uppercase tracking-tight sm:text-2xl">{side.name}</div>
        <div className={`text-xs font-bold uppercase tracking-widest ${LEAGUE_STYLES[side.tier].text}`}>
          {LEAGUE_STYLES[side.tier].label} · seed {side.seed}
        </div>
      </div>
    </div>
  )
}

/** An empty plate while the bowl is still spinning. */
function Pending() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="size-14 shrink-0 animate-pulse bg-surface-2" aria-hidden />
      <span className="text-xl font-extrabold uppercase tracking-widest text-muted sm:text-2xl">Drawing…</span>
    </div>
  )
}

export function DrawTieCard({ drawer, drawn, tieNumber }: {
  drawer: TieSide
  /** Undefined while the spinner runs. */
  drawn: TieSide | undefined
  tieNumber: number
}) {
  return (
    <div className="border-2 bg-surface p-4 shadow-sm sm:p-6" style={{ borderColor: CUP_ACCENT }}>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
          {drawn ? `Tie ${tieNumber}` : 'On the clock'}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: CUP_ACCENT }}>
          Tie {tieNumber} of 18
        </span>
      </div>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Side side={drawer} />
        <span className="shrink-0 text-center text-sm font-extrabold uppercase tracking-widest text-muted">v</span>
        {drawn ? <Side side={drawn} /> : <Pending />}
      </div>
    </div>
  )
}
