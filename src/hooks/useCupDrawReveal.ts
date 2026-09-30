import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CupDrawResult, CupField, CupTier } from '@/lib/cupDraw.mjs'
import { bowlAfter, eligibleForSpin, knockoutOrder, knockoutTimes, tierIndex } from '@/selectors'
import type { BowlTeam } from '@/components/cup/draw/DrawBowl'
import type { LedgerMatchup } from '@/components/cup/draw/DrawLedger'
import type { MatchupSide } from '@/components/cup/draw/DrawMatchupCard'

// Drives the live reveal. The bracket is decided ONCE, by drawCup, before a single crest goes
// out: everything here is presentation over an already-final result. The knockouts cannot change
// who gets drawn — the drawn team is simply never knocked out.
//
// A matchup moves through these states, and each matters on camera:
//   ready   — the drawing team is on the clock; the opponent is NOT on screen
//   drawing — crests in the bowl go out one by one ("last crest standing")
//   shown   — the opponent is revealed, and stays up until the operator moves on
// and, after the 18th is shown, one more press reaches `done`: the full results.
// Collapsing this to a drawing/not-drawing pair is what once put the opponent on screen before
// it was drawn: with nowhere to hold a revealed result, every resting state showed its answer.

/** The lone crest stays lit this long after the last knockout before the card names it. */
const LAST_ONE_MS = 500
/** Then the bowl holds on the drawn crest, highlighted, before the card fills. */
export const LAND_MS = 1200
export const TOTAL_MATCHUPS = 18

type Phase = 'ready' | 'drawing' | 'shown' | 'done'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

export interface DrawRevealState {
  /** 1-based number of the matchup on the card. */
  matchupNumber: number
  phase: Phase
  drawing: boolean
  /** When each knockout lands, in ms from pressing Draw (for the sound). */
  knockoutTimes: number[]
  /** Crests already knocked out of this matchup's draw. */
  knockedOut: Set<string>
  /** The drawn crest, once it is the last one standing — the bowl highlights it. */
  standing: string | undefined
  drawer: MatchupSide | undefined
  /** Undefined until this matchup's result is actually revealed. */
  drawn: MatchupSide | undefined
  /** The bowl is holding on the drawn crest; the card fills after LAND_MS. */
  landing: boolean
  /** Only one team could be drawn, so there was nothing to knock out. */
  forced: boolean
  /** Matchups whose result is on screen — what a reload resumes from. */
  settled: number
  ledger: LedgerMatchup[]
  /** The bowl as it stood when this matchup began. It changes only between matchups, so nothing on
   *  screen reshuffles mid-reveal; the drawn crest stays in place, highlighted, until the next one. */
  mastersBowl: BowlTeam[]
  nationalBowl: BowlTeam[]
  mastersClosed: boolean
  nationalClosed: boolean
  done: boolean
  /** Reveal the next thing: draw, cut the knockouts short, or move to the next matchup. */
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

/** A batch of pending timeouts, cancelled together. */
function useTimers() {
  const ids = useRef<number[]>([])
  const clear = useCallback(() => {
    ids.current.forEach((id) => window.clearTimeout(id))
    ids.current = []
  }, [])
  const add = useCallback((fn: () => void, ms: number) => {
    ids.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(() => clear, [clear])
  return { add, clear }
}

/**
 * `resumeAt` restarts a draw part-way through (after a reload, say) with that many matchups
 * already shown. Safe because the result is a pure function of the seed: resuming replays nothing.
 */
export function useCupDrawReveal(field: CupField, result: CupDrawResult, drawSeed: string, resumeAt = 0): DrawRevealState {
  const [start] = useState(() => initialPosition(resumeAt))
  const [index, setIndex] = useState(start.index)
  const [phase, setPhase] = useState<Phase>(start.phase)
  const [landing, setLanding] = useState(false)
  const [knocked, setKnocked] = useState(0)
  const timers = useTimers()

  const side = useMemo(() => sideBuilder(field, result), [field, result])
  const settled = phase === 'shown' || phase === 'done' ? index + 1 : index
  const bowl = useMemo(() => bowlAfter(field, result, index), [field, result, index])
  const current = result.matchups[index]
  const winner = current?.b
  const pool = useMemo(() => eligibleForSpin(bowl).map((t) => t.ffuId), [bowl])
  const order = useMemo(
    () => (winner ? knockoutOrder(pool, winner, drawSeed, index) : []),
    [pool, winner, drawSeed, index],
  )
  const times = useMemo(() => knockoutTimes(pool.length), [pool])
  const knockedOut = useMemo(() => new Set(order.slice(0, knocked)), [order, knocked])

  /** Show the result. After a full knockout run the bowl holds on the winner first; a cut-short one doesn't. */
  const reveal = useCallback((hold: boolean) => {
    timers.clear()
    setKnocked(order.length)
    setPhase('shown')
    setLanding(hold)
    if (hold) timers.add(() => setLanding(false), LAND_MS)
  }, [timers, order])

  const advance = useCallback(() => {
    if (phase === 'drawing') return reveal(false) // a second press cuts the knockouts short
    if (phase === 'done') return
    if (phase === 'shown') {
      timers.clear()
      setLanding(false)
      // The last matchup gets its own moment on the card; the next press moves to the full results.
      if (index + 1 >= TOTAL_MATCHUPS) return setPhase('done')
      setKnocked(0)
      setIndex((i) => i + 1)
      setPhase('ready')
      return
    }
    // 'ready': start drawing — unless there is nothing to knock out (one team left) or motion is off.
    if (prefersReducedMotion() || order.length === 0) return reveal(false)
    setPhase('drawing')
    times.forEach((t, k) => timers.add(() => setKnocked(k + 1), t))
    timers.add(() => reveal(true), (times.at(-1) ?? 0) + LAST_ONE_MS)
  }, [phase, index, order, times, reveal, timers])

  const ledger = useMemo(
    () => result.matchups.slice(0, settled).map((m) => ({ a: side(m.a), b: side(m.b) })),
    [result, settled, side],
  )

  return {
    matchupNumber: index + 1,
    phase,
    drawing: phase === 'drawing',
    knockoutTimes: times,
    knockedOut,
    standing: phase !== 'ready' && knocked >= order.length ? winner : undefined,
    drawer: current ? side(current.a) : undefined,
    drawn: current && settled > index ? side(current.b) : undefined,
    landing,
    forced: pool.length === 1,
    settled,
    ledger,
    ...bowl,
    done: phase === 'done',
    advance,
  }
}
