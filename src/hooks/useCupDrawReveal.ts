import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CupDrawResult, CupField, CupTier } from '@/lib/cupDraw.mjs'
import { bowlAfter, eligibleForSpin, tierIndex } from '@/selectors'
import type { BowlTeam } from '@/components/cup/draw/DrawBowl'
import type { LedgerTie } from '@/components/cup/draw/DrawLedger'
import type { TieSide } from '@/components/cup/draw/DrawTieCard'

// Drives the on-stream reveal. The bracket is decided ONCE, by drawCup, before a single crest is
// lit: everything here is presentation over an already-final result. The spinner cannot change who
// gets drawn — it only decides which crests flash on the way to showing it. That separation is the
// whole reason the streamed draw is as verifiable as the CLI one.

const SPIN_MS = 1800
const FLICKER_MS = 80
const TOTAL_TIES = 18

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

export interface DrawRevealState {
  /** Ties fully revealed so far, 0 → 18. */
  revealed: number
  spinning: boolean
  /** Crest lit by the spinner right now (cosmetic). */
  spotlitId: string | null
  drawer: TieSide | undefined
  drawn: TieSide | undefined
  ledger: LedgerTie[]
  mastersBowl: BowlTeam[]
  nationalBowl: BowlTeam[]
  mastersClosed: boolean
  nationalClosed: boolean
  done: boolean
  /** Reveal the next tie — or, mid-spin, cut straight to the result. */
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
  const [revealed, setRevealed] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [spotlitId, setSpotlitId] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  const side = useMemo(() => sideBuilder(field, result), [field, result])

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }, [])
  useEffect(() => clearTimers, [clearTimers])

  // Teams still in the bowl, and which halves the six-per-league quota has closed.
  const bowl = useMemo(() => bowlAfter(field, result, revealed), [field, result, revealed])

  const current = result.matchups[revealed]
  const drawer = current ? side(current.a) : undefined
  const drawn = spinning || !current ? undefined : side(current.b)

  const finish = useCallback(() => {
    clearTimers()
    setSpinning(false)
    setSpotlitId(null)
    setRevealed((n) => Math.min(n + 1, TOTAL_TIES))
  }, [clearTimers])

  const advance = useCallback(() => {
    if (spinning) {
      finish() // second press cuts the suspense short
      return
    }
    if (revealed >= TOTAL_TIES) return

    // Flicker only over crests that are actually eligible, so the animation never teases a team the
    // rules have already ruled out.
    const eligible = eligibleForSpin(bowl)

    if (prefersReducedMotion() || eligible.length === 0) {
      setRevealed((n) => Math.min(n + 1, TOTAL_TIES))
      return
    }

    setSpinning(true)
    for (let t = 0; t < SPIN_MS; t += FLICKER_MS) {
      timers.current.push(
        window.setTimeout(() => {
          const pick = eligible[Math.floor(Math.random() * eligible.length)]
          setSpotlitId(pick?.ffuId ?? null)
        }, t),
      )
    }
    timers.current.push(window.setTimeout(finish, SPIN_MS))
  }, [spinning, revealed, bowl, finish])

  const ledger = useMemo(
    () => result.matchups.slice(0, revealed).map((m) => ({ a: side(m.a), b: side(m.b) })),
    [result, revealed, side],
  )

  return {
    revealed,
    spinning,
    spotlitId,
    drawer,
    drawn,
    ledger,
    ...bowl,
    done: revealed >= TOTAL_TIES,
    advance,
  }
}
