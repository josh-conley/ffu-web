import { useEffect, useMemo, useState } from 'react'
import { CUP_ACCENT } from '@/config'
import { scheduleTicks } from '@/lib/drawSound'
import { REEL_EASING_CSS, tickTimes } from '@/lib/reelTiming'
import type { BowlSlot } from '@/selectors'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'

// The reveal: a strip of crests scrolling under a fixed centre marker, decelerating onto the team
// that was drawn. It is only ever an ANIMATION — the winner is already decided, and the strip is
// built to arrive at it. Swappable: it takes the eligible pool and the winner, which is all any
// reveal treatment needs, so a different one can drop straight in.

const ITEM_PX = 128
/**
 * Crests scrolled past before landing. Scaled with SPIN_MS so the wheel keeps a readable pace
 * (~28 crests/sec at speed) for the whole of the fast phase instead of easing off early.
 */
const RUN_UP = 100

/**
 * CSS `linear()` easing is what lets the picture follow the braking model exactly. Browsers
 * without it (pre-2023) would reject the whole transition and jump straight to the winner, so they
 * get a plain ease-out instead: the reel still slows, just not quite in step with the ticks.
 */
const REEL_EASING =
  typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', REEL_EASING_CSS) ? REEL_EASING_CSS : 'ease-out'

function Cell({ team, winner }: { team: BowlSlot; winner: boolean }) {
  return (
    <div
      className="flex shrink-0 flex-col items-center justify-center gap-1 border bg-surface transition-colors"
      style={{
        width: ITEM_PX - 8,
        height: ITEM_PX - 8,
        marginInline: 4,
        borderColor: winner ? CUP_ACCENT : 'var(--color-border)',
        borderWidth: winner ? 3 : 1,
      }}
    >
      <TeamLogo ffuId={team.ffuId} size={48} clickable={false} />
      <span className="w-full truncate px-1 text-center text-xs font-bold leading-tight">{team.name}</span>
      <span className={`text-[10px] font-extrabold uppercase tracking-widest ${LEAGUE_STYLES[team.tier].text}`}>
        {LEAGUE_STYLES[team.tier].label}
      </span>
    </div>
  )
}

/** Crests either side of the marker at rest, so the strip fills a wide screen before and after. */
const PAD = 10

/**
 * The reel stays on screen for the whole matchup: still while a team is on the clock, spinning on
 * Draw, then resting on the winner until the next matchup. (It used to mount only for the spin,
 * and the stage jumped every time it came and went.)
 *
 * `motion` is 'spin' while the wheel is moving or just landing, 'still' otherwise. Dropping to
 * 'still' mid-spin (the operator cut it short) removes the transition, which snaps the strip to
 * the winner, and cancels the pending ticks.
 */
export function DrawReel({ pool, winnerId, durationMs, muted, motion, landed }: {
  pool: BowlSlot[]
  /** Undefined until the draw is under way — the result never reaches the DOM before it is drawn. */
  winnerId: string | undefined
  durationMs: number
  muted: boolean
  motion: 'spin' | 'still'
  /** The result is in: outline the winner under the marker. */
  landed: boolean
}) {
  const [rolled, setRolled] = useState(false)

  // Padding, the run-up, the winner, then padding. The run-up simply CYCLES the pool rather than
  // sampling it randomly: it looks identical in motion, and keeps the render pure — the only
  // randomness in this whole feature belongs to drawCup, which has already run. Before the draw
  // the winner's slot holds an ordinary crest, far off screen.
  const strip = useMemo(() => {
    if (pool.length === 0) return []
    const cycle = (n: number, from: number) => Array.from({ length: n }, (_, i) => pool[(from + i) % pool.length]!)
    const end = PAD + RUN_UP
    const winner = pool.find((t) => t.ffuId === winnerId) ?? pool[end % pool.length]!
    return [...cycle(end, 0), winner, ...cycle(PAD, end + 1)]
  }, [pool, winnerId])

  // Flip to the landed offset on the next frame so the CSS transition actually runs.
  useEffect(() => {
    if (motion !== 'spin') return
    const id = requestAnimationFrame(() => setRolled(true))
    return () => cancelAnimationFrame(id)
  }, [motion])

  // One tick per crest crossing the marker, timed off the SAME curve as the transition below — so
  // the wheel is heard to slow at exactly the rate it is seen to. Cancelled if the spin is cut short.
  useEffect(() => {
    if (muted || motion !== 'spin') return
    return scheduleTicks(tickTimes(RUN_UP, durationMs))
  }, [muted, motion, durationMs])

  // A result shown without a spin (reduced motion, or one team left) sits on the winner at once.
  const atEnd = winnerId !== undefined && (rolled || motion === 'still')
  const centred = atEnd ? PAD + RUN_UP : PAD
  const offset = -(centred * ITEM_PX + ITEM_PX / 2)

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
          transition: motion === 'spin' && rolled ? `transform ${durationMs}ms ${REEL_EASING}` : undefined,
        }}
      >
        {strip.map((team, i) => (
          <Cell key={`${team.ffuId}-${i}`} team={team} winner={landed && i === PAD + RUN_UP} />
        ))}
      </div>
    </div>
  )
}
