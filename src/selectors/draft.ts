import type { DraftData, DraftPick } from '@/data'

// Pure draft derivations shared by the board + list views (single home — Charter DRY). Presentation
// (position colors, snake arrows, name shortening) stays in the components.

/** Map slot → original draft-order owner. Prefer `draftOrder`; fall back to round-1 picks if empty. */
export function teamsBySlot(draft: DraftData): Map<number, string> {
  const bySlot = new Map<number, string>()
  for (const [memberId, slot] of Object.entries(draft.draftOrder)) bySlot.set(slot, memberId)
  if (bySlot.size === 0) {
    for (const p of draft.picks) if (p.round === 1) bySlot.set(p.slot, p.memberId)
  }
  return bySlot
}

/**
 * Pick label in true draft notation (e.g. `6.09`), derived from the OVERALL pick so snake
 * even-rounds read correctly — the within-round position reverses each round, but `overall` does
 * not, so `overall - (round-1)*teams` is the real pick-in-round regardless of slot.
 */
export function pickLabel(pick: DraftPick, numTeams: number): string {
  const inRound = numTeams > 0 ? pick.overall - (pick.round - 1) * numTeams : pick.slot
  return `${pick.round}.${String(inRound).padStart(2, '0')}`
}

/** A pick is traded when the team that made it isn't the slot's original draft-order owner. */
export function isTraded(pick: DraftPick, bySlot: Map<number, string>): boolean {
  const owner = bySlot.get(pick.slot)
  return owner !== undefined && owner !== pick.memberId
}

/**
 * Every overall pick number a slot owns, round 1 → `rounds`. Snake order reverses each even round,
 * so slot 1 picks 1st and then last-but-one; derived rather than stored because it is pure
 * arithmetic off the draft's shape, and the pre-draft board has no picks to read it from.
 */
export function snakePickNumbers(slot: number, rounds: number, teams: number): number[] {
  if (slot < 1 || slot > teams || rounds < 1) return []
  const picks: number[] = []
  for (let round = 1; round <= rounds; round++) {
    const inRound = round % 2 === 1 ? slot : teams - slot + 1
    picks.push((round - 1) * teams + inRound)
  }
  return picks
}
