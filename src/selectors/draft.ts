import type { DraftData, DraftPick, DraftSchedule } from '@/data'

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

/**
 * How long after its scheduled start a draft still counts as live without Sleeper saying so. Covers
 * the gap between the clock hitting the hour and the commissioner actually pressing start.
 */
const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000

export type DraftPhase = 'upcoming' | 'live' | 'complete'

/**
 * Where a scheduled draft has got to, for the home page's announcement.
 *
 * Sleeper's status leads, because it is the truth: it says `drafting` from the first pick to the
 * last however long that takes, so a long draft is never prematurely called over. The scheduled
 * window only fills the gap on either side of the commissioner pressing start. Past that window
 * with the status still `pre_draft`, nothing has happened — the draft was postponed, most likely —
 * so it reads as upcoming again rather than claiming to be finished.
 */
export function draftPhase(schedule: DraftSchedule, now: number = Date.now()): DraftPhase {
  if (schedule.status === 'complete') return 'complete'
  if (schedule.status === 'drafting') return 'live'
  const start = schedule.startTime
  if (start !== null && now >= start && now < start + LIVE_WINDOW_MS) return 'live'
  return 'upcoming'
}
