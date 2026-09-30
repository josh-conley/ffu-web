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
// Collapsing this to a spinning/not-spinning pair is what caused the opponent to be visible before
// it was drawn: with nowhere to hold a revealed result, every matchup's resting state showed its answer.

// 1800 → 2600 → 5500 (2026-08-21). Paired with REEL_CURVE, which holds pace for the first ~60% of
// the run rather than braking immediately: the wheel now spins for about three seconds before it
// visibly slows. One constant — shorten it here if it drags on the night.
export const SPIN_MS = 5500
const TOTAL_MATCHUPS = 18

type Phase = 'ready' | 'spinning' | 'shown'

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

export function useCupDrawReveal(field: CupField, result: CupDrawResult): DrawRevealState {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const timer = useRef<number | undefined>(undefined)

  const side = useMemo(() => sideBuilder(field, result), [field, result])

  const clearTimers = useCallback(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current)
    timer.current = undefined
  }, [])
  useEffect(() => clearTimers, [clearTimers])

  // Teams out of the bowl = matchups whose result is on screen. A matchup mid-spin has NOT left the bowl,
  // so its crest is still there to be flickered over.
  const settled = phase === 'shown' ? index + 1 : index
  const bowl = useMemo(() => bowlAfter(field, result, settled), [field, result, settled])

  // Only crests the rules still allow, so the animation can never tease an impossible team.
  const spinPool = useMemo(() => eligibleForSpin(bowl), [bowl])
  const current = result.matchups[index]
  const drawer = current ? side(current.a) : undefined
  const drawn = current && phase === 'shown' ? side(current.b) : undefined

  const reveal = useCallback(() => {
    clearTimers()
    setPhase('shown')
  }, [clearTimers])

  const advance = useCallback(() => {
    if (phase === 'spinning') {
      reveal() // second press cuts the suspense short
      return
    }
    if (phase === 'shown') {
      if (index + 1 >= TOTAL_MATCHUPS) return // the last matchup stays up; the draw is over
      setIndex((i) => i + 1)
      setPhase('ready')
      return
    }
    // 'ready': start drawing.
    if (prefersReducedMotion() || spinPool.length === 0) {
      reveal()
      return
    }
    setPhase('spinning')
    timer.current = window.setTimeout(reveal, SPIN_MS)
  }, [phase, index, spinPool, reveal])

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
    ledger,
    ...bowl,
    done: index + 1 >= TOTAL_MATCHUPS && phase === 'shown',
    advance,
  }
}
