import type { Tournament } from '../data/types'
import { pairAdjacent, pairReseeded, type Pair } from './cupPairing'

// The Cup pick'em: a member predicts the whole bracket before the opening round. Pure and shared —
// the page builds the bracket a member is filling in from it, and the Worker (workers/pickem)
// rejects any submission it doesn't accept, so the two can never disagree about what a valid
// entry is. Relative imports only (the Worker bundles this outside Vite's `@/` alias).
//
// The Cup's two irregularities are handled by walking the tournament's own round flags, exactly as
// the played bracket does (selectors/tournament): after the Round of 18 the lowest-scoring winner
// is dropped, so the member also PICKS which of their nine winners that is; the quarterfinals are
// then re-seeded by draw seed from the eight left (pairReseeded, the same function the real
// bracket uses).

/** What a member submits. Stored as-is; everything else here is derived from it. */
export interface CupPicks {
  /** Per round key: the picked winner of each matchup, by its position in that round. null = not yet. */
  winners: Record<string, (string | null)[]>
  /** Per round key whose winners lose one to the lowest-winner drop: the team picked to be culled. */
  drops: Record<string, string>
}

export interface PickSlot {
  /** Undefined while the pick that would put a team here is still open. */
  a?: string
  b?: string
  pick?: string
}

export interface PickRound {
  key: string
  label: string
  slots: PickSlot[]
  /** True when the next round drops this round's lowest-scoring winner, so a drop pick is owed. */
  needsDrop: boolean
  /** The picked drop, once it is one of this round's picked winners. */
  drop?: string
}

export const EMPTY_PICKS: CupPicks = { winners: {}, drops: {} }

type Slot = string | undefined

/** Pairs a round from the winners carried into it. Unknown entrants leave the pairing open. */
function pairRound(t: Tournament, i: number, carried: Slot[], picks: CupPicks, seedOf: Map<string, number>): Pair<Slot>[] {
  const round = t.rounds[i]!
  if (round.matchups) return round.matchups
  if (i === 0) return []
  let pool = carried
  if (round.dropLowestWinner) {
    const drop = picks.drops[t.rounds[i - 1]!.key]
    // Without a valid drop the field can't be formed yet: the same number of slots, all open.
    pool = drop !== undefined && carried.includes(drop) ? carried.filter((id) => id !== drop) : carried.slice(1).map(() => undefined)
  }
  if (!round.reseed) return pairAdjacent(pool)
  const known = pool.filter((id): id is string => id !== undefined)
  if (known.length < pool.length) return Array.from({ length: Math.floor(pool.length / 2) }, () => ({ a: undefined, b: undefined }))
  return pairReseeded(known, seedOf)
}

/** The bracket a set of picks describes. Picks that no longer fit (an upstream change) are ignored. */
export function pickBracket(t: Tournament, picks: CupPicks): PickRound[] {
  const seedOf = new Map(t.participants.flatMap((p) => (p.seed !== undefined ? [[p.ffuId, p.seed] as const] : [])))
  const rounds: PickRound[] = []
  let carried: Slot[] = []
  t.rounds.forEach((round, i) => {
    const chosen = picks.winners[round.key] ?? []
    const slots = pairRound(t, i, carried, picks, seedOf).map(({ a, b }, j): PickSlot => {
      const c = chosen[j]
      const valid = c != null && a !== undefined && b !== undefined && (c === a || c === b)
      return { a, b, pick: valid ? c : undefined }
    })
    const winners = slots.map((s) => s.pick)
    const needsDrop = t.rounds[i + 1]?.dropLowestWinner === true
    const drop = picks.drops[round.key]
    const validDrop = needsDrop && drop !== undefined && winners.includes(drop) ? drop : undefined
    rounds.push({ key: round.key, label: round.label, slots, needsDrop, drop: validDrop })
    carried = winners
  })
  return rounds
}

/** The picks a bracket actually holds — what `pickBracket` kept, nothing stale. */
export function picksOf(bracket: PickRound[]): CupPicks {
  const winners: CupPicks['winners'] = {}
  const drops: CupPicks['drops'] = {}
  for (const r of bracket) {
    winners[r.key] = r.slots.map((s) => s.pick ?? null)
    if (r.drop !== undefined) drops[r.key] = r.drop
  }
  return { winners, drops }
}

/** Picks `ffuId` to win matchup `index` of `roundKey`, dropping any later pick it invalidates. */
export function setWinner(t: Tournament, picks: CupPicks, roundKey: string, index: number, ffuId: string): CupPicks {
  const row = [...(picks.winners[roundKey] ?? [])]
  while (row.length <= index) row.push(null)
  row[index] = ffuId
  return picksOf(pickBracket(t, { ...picks, winners: { ...picks.winners, [roundKey]: row } }))
}

/** Picks `ffuId` as the winner of `roundKey` culled by the next round's lowest-winner drop. */
export function setDrop(t: Tournament, picks: CupPicks, roundKey: string, ffuId: string): CupPicks {
  return picksOf(pickBracket(t, { ...picks, drops: { ...picks.drops, [roundKey]: ffuId } }))
}

/** Every matchup picked and every owed drop made. */
export function isComplete(bracket: PickRound[]): boolean {
  return (
    bracket.length > 0 &&
    bracket.every((r) => r.slots.length > 0 && r.slots.every((s) => s.pick !== undefined) && (!r.needsDrop || r.drop !== undefined))
  )
}

/** The champion a bracket predicts, once the final is picked. */
export function pickedChampion(bracket: PickRound[]): string | undefined {
  return bracket[bracket.length - 1]?.slots[0]?.pick
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Narrows untrusted JSON to the CupPicks shape (no bracket logic — see validatePicks). */
export function parsePicks(raw: unknown): CupPicks | undefined {
  if (!isRecord(raw) || !isRecord(raw.winners) || !isRecord(raw.drops)) return undefined
  const winners: CupPicks['winners'] = {}
  for (const [key, row] of Object.entries(raw.winners)) {
    if (!Array.isArray(row) || !row.every((id) => id === null || typeof id === 'string')) return undefined
    winners[key] = row as (string | null)[]
  }
  const drops: CupPicks['drops'] = {}
  for (const [key, id] of Object.entries(raw.drops)) {
    if (typeof id !== 'string') return undefined
    drops[key] = id
  }
  return { winners, drops }
}

/**
 * A submitted entry, accepted only when it is a COMPLETE bracket consistent with this tournament:
 * every pick one of its matchup's two teams, nothing stale or extra. Returns the picks, or why not.
 */
export function validatePicks(t: Tournament, raw: unknown): CupPicks | string {
  if (t.participants.length === 0) return 'The draw has not been held yet'
  const picks = parsePicks(raw)
  if (picks === undefined) return 'Picks are not in the expected shape'
  const bracket = pickBracket(t, picks)
  if (!isComplete(bracket)) return 'The bracket is not complete'
  // pickBracket silently ignores what doesn't fit; a submission must not contain any such pick.
  const kept = picksOf(bracket)
  return samePicks(kept, picks) ? kept : 'Some picks do not match the bracket'
}

function samePicks(a: CupPicks, b: CupPicks): boolean {
  const keys = (r: Record<string, unknown>) => Object.keys(r).sort().join()
  if (keys(a.winners) !== keys(b.winners) || keys(a.drops) !== keys(b.drops)) return false
  return Object.keys(a.winners).every((k) => JSON.stringify(a.winners[k]) === JSON.stringify(b.winners[k])) &&
    Object.keys(a.drops).every((k) => a.drops[k] === b.drops[k])
}
