import type { CupDrawResult, CupField, CupTier } from '@/lib/cupDraw.mjs'

// Pure derivations behind the live draw's stage. The DRAW itself is decided by src/lib/cupDraw.mjs;
// everything here just describes what the audience should be looking at after N ties have been
// revealed. Kept out of the component so the quota-visibility rule — the bit that is easy to get
// subtly wrong — can be tested.

const PHASE_ONE_TIES = 12
const QUOTA_PER_LEAGUE = 6

export interface BowlSlot {
  ffuId: string
  name: string
  tier: CupTier
}

export interface BowlState {
  /** Masters teams still drawable. Empties once Premier is done and they become drawers. */
  mastersBowl: BowlSlot[]
  nationalBowl: BowlSlot[]
  /** True once this league has given up its six and is closed for the rest of Premier's draw. */
  mastersClosed: boolean
  nationalClosed: boolean
}

/** ffuId → tier, over the whole field. */
export function tierIndex(field: CupField): Map<string, CupTier> {
  const tierOf = new Map<string, CupTier>()
  for (const tier of ['PREMIER', 'MASTERS', 'NATIONAL'] as CupTier[]) {
    for (const t of field[tier]) tierOf.set(t.ffuId, tier)
  }
  return tierOf
}

/**
 * What is left in the bowl after `revealed` ties.
 *
 * Two rules drive it. A league that has given up six teams is CLOSED for the rest of Premier's
 * draw — that is the constraint the amendment's clarification adds, and showing it is half the
 * point of the visual. And once Premier has finished all twelve, the leftover Masters teams stop
 * being drawable at all: they become the drawers for the second phase, so they leave the bowl.
 */
export function bowlAfter(field: CupField, result: CupDrawResult, revealed: number): BowlState {
  const tierOf = tierIndex(field)
  const drawnSoFar = result.drawnOrder.slice(0, revealed)
  const taken = new Set(drawnSoFar.map((t) => t.ffuId))

  let masters = 0
  let national = 0
  for (const t of drawnSoFar) {
    const tier = tierOf.get(t.ffuId)
    if (tier === 'MASTERS') masters++
    else if (tier === 'NATIONAL') national++
  }

  const remaining = (tier: CupTier): BowlSlot[] =>
    field[tier].filter((t) => !taken.has(t.ffuId)).map((t) => ({ ffuId: t.ffuId, name: t.name, tier }))

  const phaseOne = revealed < PHASE_ONE_TIES
  return {
    mastersBowl: phaseOne ? remaining('MASTERS') : [],
    nationalBowl: remaining('NATIONAL'),
    mastersClosed: phaseOne && masters === QUOTA_PER_LEAGUE,
    nationalClosed: phaseOne && national === QUOTA_PER_LEAGUE,
  }
}

/** Crests the spinner may flicker over — never one the rules have already ruled out. */
export function eligibleForSpin(bowl: BowlState): BowlSlot[] {
  if (bowl.mastersClosed) return bowl.nationalBowl
  if (bowl.nationalClosed) return bowl.mastersBowl
  return [...bowl.mastersBowl, ...bowl.nationalBowl]
}
