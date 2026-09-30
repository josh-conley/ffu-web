import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CupDrawResult, CupField, CupTier } from '@/lib/cupDraw.mjs'
import { bowlAfter, eligibleForSpin, tierIndex } from '@/selectors'
import type { BowlTeam } from '@/components/cup/draw/DrawBowl'
import type { LedgerMatchup } from '@/components/cup/draw/DrawLedger'
import type { MatchupSide } from '@/components/cup/draw/DrawMatchupCard'

// Drives the on-stream reveal. The bracket is decided ONCE, by drawCup, before a single crest is
// lit: everything here is presentation over an already-final result. The spinner cannot change who
// gets drawn — it only decides which crests flash on the way to showing it.
//
// A matchup moves through THREE states, and all three matter on camera:
//   ready    — the drawing team is on the clock; the opponent is NOT on screen
//   spinning — the bowl flickers
//   shown    — the opponent is revealed, and stays up until the operator moves on
// and, after the 18th is shown, one more press reaches `done`: the full results.
// Collapsing this to a spinning/not-spinning pair is what caused the opponent to be visible before
// it was drawn: with nowhere to hold a revealed result, every matchup's resting state showed its answer.

// 1800 → 2600 → 5500 (2026-08-21). The reel runs at full speed for the first 30% of this, then
// brakes steadily (src/lib/reelTiming.ts). One constant — shorten it here if it drags on the night.
export const SPIN_MS = 5500
/** How long the reel rests on the winner after a full spin before it clears — the landing is the event. */
export const LAND_MS = 1200
export const TOTAL_MATCHUPS = 18

type Phase = 'ready' | 'spinning' | 'shown' | 'done'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

export interface DrawRevealState {
  /** 1-based number of the matchup on the card. */
  matchupNumber: number
  phase: Phase
  spinning: boolean
  /** Crests the reveal animation may show — never one the rules have ruled out. */
  spinPool: BowlTeam[]
  /** The team this matchup actually lands on. Known up front; the animation only has to arrive at it. */
  spinWinner: string | undefined
  drawer: MatchupSide | undefined
  /** Undefined until this matchup's result is actually revealed. */
  drawn: MatchupSide | undefined
  /** The reel has just landed and is resting on the winner; it clears after LAND_MS. */
  landing: boolean
  /** This matchup was revealed by a spin (false when it skipped straight to the result). */
  spun: boolean
  /** Only one team could be drawn, so there was nothing to spin for. */
  forced: boolean
  /** Matchups whose result is on screen — what a reload resumes from. */
  settled: number
  ledger: LedgerMatchup[]
  mastersBowl: BowlTeam[]
  nationalBowl: BowlTeam[]
  mastersClosed: boolean
  nationalClosed: boolean
  done: boolean
  /** Reveal the next thing: spin, or cut a spin short, or move to the next matchup. */
  advance: () => void
}

/** ffuId → the nameplate the stage renders for it. */
function sideBuilder(field: CupField, result: CupDrawResult): (ffuId: string) => MatchupSide {
  const tierOf = tierIndex(field)
  const nameOf = new Map<string, string>()
  for (const tier of ['PREMIER', 'MASTERS', 'NATIONAL'] as CupTier[]) {
    for (const t of field[tier]) nameOf.set(t.ffuId, t.name)
  }
  const seedOf = new Map(result.participants.map((p) => [p.ffuId, p.seed]))
  return (ffuId) => ({
    ffuId,
    name: nameOf.get(ffuId) ?? ffuId,
    tier: tierOf.get(ffuId) ?? 'NATIONAL',
    seed: seedOf.get(ffuId) ?? 0,
  })
}

/** Where a resumed draw picks up: `settled` matchups already shown (0 = a fresh draw). */
function initialPosition(settled: number): { index: number; phase: Phase } {
  const n = Math.max(0, Math.min(TOTAL_MATCHUPS, Math.floor(settled)))
  return n >= TOTAL_MATCHUPS ? { index: TOTAL_MATCHUPS - 1, phase: 'done' } : { index: n, phase: 'ready' }
}

/** One pending timeout, replaced or cancelled as a unit. */
function useTimer() {
  const ref = useRef<number | undefined>(undefined)
  const clear = useCallback(() => {
    if (ref.current !== undefined) window.clearTimeout(ref.current)
    ref.current = undefined
  }, [])
  const set = useCallback((fn: () => void, ms: number) => {
    clear()
    ref.current = window.setTimeout(fn, ms)
  }, [clear])
  useEffect(() => clear, [clear])
  return { set, clear }
}

/**
 * `resumeAt` restarts a draw part-way through (after a reload, say) with that many matchups
 * already shown. Safe because the result is a pure function of the seed: resuming replays nothing.
 */
export function useCupDrawReveal(field: CupField, result: CupDrawResult, resumeAt = 0): DrawRevealState {
  const [start] = useState(() => initialPosition(resumeAt))
  const [index, setIndex] = useState(start.index)
  const [phase, setPhase] = useState<Phase>(start.phase)
  const [landing, setLanding] = useState(false)
  const [spun, setSpun] = useState(false)
  const spinTimer = useTimer()
  const landTimer = useTimer()

  const side = useMemo(() => sideBuilder(field, result), [field, result])

  // Teams out of the bowl = matchups whose result is on screen. A matchup mid-spin has NOT left the bowl,
  // so its crest is still there to be flickered over.
  const settled = phase === 'shown' || phase === 'done' ? index + 1 : index
  const bowl = useMemo(() => bowlAfter(field, result, settled), [field, result, settled])
  // Only crests the rules still allow, so the animation can never tease an impossible team. Taken
  // from the bowl as it stood BEFORE this matchup, so it still describes the draw once it is shown.
  const spinPool = useMemo(() => eligibleForSpin(bowlAfter(field, result, index)), [field, result, index])
  const forced = spinPool.length === 1

  const current = result.matchups[index]
  const drawer = current ? side(current.a) : undefined
  const drawn = current && settled > index ? side(current.b) : undefined

  /** Show the result. After a full spin the reel rests on the winner first; a cut-short one doesn't. */
  const reveal = useCallback((rest: boolean) => {
    spinTimer.clear()
    setPhase('shown')
    setLanding(rest)
    if (rest) landTimer.set(() => setLanding(false), LAND_MS)
  }, [spinTimer, landTimer])

  const advance = useCallback(() => {
    if (phase === 'spinning') return reveal(false) // second press cuts the suspense short
    if (phase === 'done') return
    if (phase === 'shown') {
      landTimer.clear()
      setSpun(false)
      // The last matchup gets its own moment on the card; the next press moves to the full results.
      if (index + 1 >= TOTAL_MATCHUPS) {
        setLanding(false)
        setPhase('done')
        return
      }
      setLanding(false)
      setIndex((i) => i + 1)
      setPhase('ready')
      return
    }
    // 'ready': start drawing — unless there is nothing to spin for (one team left) or motion is off.
    if (prefersReducedMotion() || spinPool.length <= 1) return reveal(false)
    setPhase('spinning')
    setSpun(true)
    spinTimer.set(() => reveal(true), SPIN_MS)
  }, [phase, index, spinPool, reveal, spinTimer, landTimer])

  const ledger = useMemo(
    () => result.matchups.slice(0, settled).map((m) => ({ a: side(m.a), b: side(m.b) })),
    [result, settled, side],
  )

  return {
    matchupNumber: index + 1,
    phase,
    spinning: phase === 'spinning',
    spinPool,
    spinWinner: current?.b,
    drawer,
    drawn,
    landing,
    spun,
    forced,
    settled,
    ledger,
    ...bowl,
    done: phase === 'done',
    advance,
  }
}
