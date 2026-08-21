import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CupDrawResult, CupField, CupTier } from '@/lib/cupDraw.mjs'
import { bowlAfter, eligibleForSpin, tierIndex } from '@/selectors'
import type { BowlTeam } from '@/components/cup/draw/DrawBowl'
import type { LedgerTie } from '@/components/cup/draw/DrawLedger'
import type { TieSide } from '@/components/cup/draw/DrawTieCard'

// Drives the on-stream reveal. The bracket is decided ONCE, by drawCup, before a single crest is
// lit: everything here is presentation over an already-final result. The spinner cannot change who
// gets drawn — it only decides which crests flash on the way to showing it.
//
// A tie moves through THREE states, and all three matter on camera:
//   ready    — the drawing team is on the clock; the opponent is NOT on screen
//   spinning — the bowl flickers
//   shown    — the opponent is revealed, and stays up until the operator moves on
// Collapsing this to a spinning/not-spinning pair is what caused the opponent to be visible before
// it was drawn: with nowhere to hold a revealed result, every tie's resting state showed its answer.

export const SPIN_MS = 1800
const TOTAL_TIES = 18

type Phase = 'ready' | 'spinning' | 'shown'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

export interface DrawRevealState {
  /** 1-based number of the tie on the card. */
  tieNumber: number
  phase: Phase
  spinning: boolean
  /** Crests the reveal animation may show — never one the rules have ruled out. */
  spinPool: BowlTeam[]
  /** The team this tie actually lands on. Known up front; the animation only has to arrive at it. */
  spinWinner: string | undefined
  drawer: TieSide | undefined
  /** Undefined until this tie's result is actually revealed. */
  drawn: TieSide | undefined
  ledger: LedgerTie[]
  mastersBowl: BowlTeam[]
  nationalBowl: BowlTeam[]
  mastersClosed: boolean
  nationalClosed: boolean
  done: boolean
  /** Reveal the next thing: spin, or cut a spin short, or move to the next tie. */
  advance: () => void
}

/** ffuId → the nameplate the stage renders for it. */
function sideBuilder(field: CupField, result: CupDrawResult): (ffuId: string) => TieSide {
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

  // Teams out of the bowl = ties whose result is on screen. A tie mid-spin has NOT left the bowl,
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
      if (index + 1 >= TOTAL_TIES) return // the last tie stays up; the draw is over
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
    tieNumber: index + 1,
    phase,
    spinning: phase === 'spinning',
    spinPool,
    spinWinner: current?.b,
    drawer,
    drawn,
    ledger,
    ...bowl,
    done: index + 1 >= TOTAL_TIES && phase === 'shown',
    advance,
  }
}
