import { CUP_PICKEM_POINTS, isCupRoundKey } from '@/config/cup'
import type { PickRound } from '@/lib/cupPickem'
import type { ResolvedTournament } from './tournament'

// Scores pick'em brackets against the played Cup. Derived on every render from the stored picks and
// the resolved bracket — scores are never stored (Charter: "derived data is never stored").
//
// A pick is correct when that team WON its game in that round, wherever the member had it in the
// bracket: a member who called the right quarterfinalist via a different path still gets the
// points. A Round of 18 winner later culled as the lowest-scoring winner still won its Round of 18
// game, so it counts there (and simply goes no further).

export interface PickemScore {
  points: number
  /** Points still possible: the current score plus every undecided pick whose team is still alive. */
  maxPoints: number
  correct: number
}

const pointsFor = (key: string) => (isCupRoundKey(key) ? CUP_PICKEM_POINTS[key] : 0)

/** Teams out of the Cup so far: every decided loser, and anyone culled by the drop. */
function eliminated(played: ResolvedTournament): Set<string> {
  const out = new Set<string>()
  for (const round of played.rounds) {
    for (const m of round.matchups) {
      if (m.winner !== undefined) out.add(m.winner === m.a.ffuId ? m.b.ffuId : m.a.ffuId)
    }
    for (const d of round.dropped) out.add(d.ffuId)
  }
  return out
}

/** How a pick turned out: its team won that round's game, can no longer, or still might. */
export type PickOutcome = 'won' | 'lost' | 'pending'

/** Each slot's outcome, by round key (undefined where nothing is picked). */
export function pickOutcomes(bracket: PickRound[], played: ResolvedTournament): Record<string, (PickOutcome | undefined)[]> {
  const out = eliminated(played)
  const result: Record<string, (PickOutcome | undefined)[]> = {}
  for (const round of bracket) {
    const actual = played.rounds.find((r) => r.key === round.key)
    const winners = new Set(actual?.matchups.flatMap((m) => (m.winner !== undefined ? [m.winner] : [])))
    // A round is settled once each of its games has a winner; until then picks are still live.
    const settled = actual !== undefined && actual.matchups.length > 0 && winners.size === actual.matchups.length
    result[round.key] = round.slots.map((slot) => {
      if (slot.pick === undefined) return undefined
      if (winners.has(slot.pick)) return 'won'
      return settled || out.has(slot.pick) ? 'lost' : 'pending'
    })
  }
  return result
}

export function scorePickem(bracket: PickRound[], played: ResolvedTournament): PickemScore {
  let points = 0
  let pending = 0
  let correct = 0
  for (const [key, outcomes] of Object.entries(pickOutcomes(bracket, played))) {
    for (const outcome of outcomes) {
      if (outcome === 'won') {
        points += pointsFor(key)
        correct += 1
      } else if (outcome === 'pending') {
        pending += pointsFor(key)
      }
    }
  }
  return { points, maxPoints: points + pending, correct }
}

/** A perfect bracket's score. */
export function maxPickemPoints(bracket: PickRound[]): number {
  return bracket.reduce((sum, round) => sum + round.slots.length * pointsFor(round.key), 0)
}

export interface RankedEntry<T> {
  entry: T
  score: PickemScore
  /** 1-based; tied scores share a rank. */
  rank: number
}

/** Best score first; ties broken by points still possible, and still sharing a rank when equal. */
export function rankPickem<T>(entries: readonly T[], scoreOf: (entry: T) => PickemScore): RankedEntry<T>[] {
  const scored = entries.map((entry) => ({ entry, score: scoreOf(entry) }))
  scored.sort((x, y) => y.score.points - x.score.points || y.score.maxPoints - x.score.maxPoints)
  return scored.map((s, i) => {
    const prev = scored.findIndex((o) => o.score.points === s.score.points && o.score.maxPoints === s.score.maxPoints)
    return { ...s, rank: (prev === -1 ? i : prev) + 1 }
  })
}
