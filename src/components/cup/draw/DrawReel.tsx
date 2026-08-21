import { useEffect, useMemo, useState } from 'react'
import { CUP_ACCENT } from '@/config'
import { scheduleTicks } from '@/lib/drawSound'
import { REEL_EASING_CSS, tickTimes } from '@/lib/reelTiming'
import type { BowlTeam } from './DrawBowl'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'

// The reveal: a strip of crests scrolling under a fixed centre marker, decelerating onto the team
// that was drawn. It is only ever an ANIMATION — the winner is already decided, and the strip is
// built to arrive at it. Swappable: it takes the eligible pool and the winner, which is all any
// reveal treatment needs, so a different one can drop straight in.

const ITEM_PX = 104
/**
 * Crests scrolled past before landing. Scaled with SPIN_MS so the wheel keeps a readable pace
 * (~28 crests/sec at speed) for the whole of the fast phase instead of easing off early.
 */
const RUN_UP = 100

function Cell({ team }: { team: BowlTeam }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 border border-border bg-surface" style={{ width: ITEM_PX - 8, height: ITEM_PX - 8, marginInline: 4 }}>
      <TeamLogo ffuId={team.ffuId} size={40} />
      <span className="w-full truncate px-1 text-center text-[10px] font-bold leading-tight">{team.name}</span>
      <span className={`text-[8px] font-extrabold uppercase tracking-widest ${LEAGUE_STYLES[team.tier].text}`}>
        {LEAGUE_STYLES[team.tier].label}
      </span>
    </div>
  )
}

export function DrawReel({ pool, winnerId, durationMs, muted }: {
  pool: BowlTeam[]
  winnerId: string
  durationMs: number
  muted: boolean
}) {
  const [rolling, setRolling] = useState(false)

  // Run-up, then the winner. The run-up simply CYCLES the pool rather than sampling it randomly:
  // it looks identical in motion, and keeps the render pure — the only randomness in this whole
  // feature belongs to drawCup, which has already run.
  const strip = useMemo(() => {
    if (pool.length === 0) return []
    const cycle = (n: number, from: number) => Array.from({ length: n }, (_, i) => pool[(from + i) % pool.length]!)
    const winner = pool.find((t) => t.ffuId === winnerId)
    return winner ? [...cycle(RUN_UP, 0), winner, ...cycle(4, RUN_UP)] : cycle(RUN_UP, 0)
  }, [pool, winnerId])

  const winnerIndex = strip.length > 0 ? Math.min(RUN_UP, strip.length - 1) : 0

  // Flip to the landed offset on the next frame so the CSS transition actually runs.
  useEffect(() => {
    const id = requestAnimationFrame(() => setRolling(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // One tick per crest crossing the marker, timed off the SAME curve as the transition below — so
  // the wheel is heard to slow at exactly the rate it is seen to. Cancelled if the spin is cut short.
  useEffect(() => {
    if (muted || winnerIndex <= 0) return
    return scheduleTicks(tickTimes(winnerIndex, durationMs))
  }, [muted, winnerIndex, durationMs])

  const offset = rolling ? -(winnerIndex * ITEM_PX + ITEM_PX / 2) : -(ITEM_PX / 2)

  return (
    <div className="relative overflow-hidden border border-border bg-surface-2/60 py-3" style={{ height: ITEM_PX + 16 }}>
      {/* The marker the strip lands under. */}
      <span className="absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2" style={{ backgroundColor: CUP_ACCENT }} aria-hidden />
      <span className="absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg to-transparent" aria-hidden />
      <span className="absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg to-transparent" aria-hidden />
      <div
        className="absolute left-1/2 top-3 flex"
        style={{
          transform: `translateX(${offset}px)`,
          transition: rolling ? `transform ${durationMs}ms ${REEL_EASING_CSS}` : undefined,
        }}
      >
        {strip.map((team, i) => (
          <Cell key={`${team.ffuId}-${i}`} team={team} />
        ))}
      </div>
    </div>
  )
}
