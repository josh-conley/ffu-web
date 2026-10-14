import { bracketPositions } from './cupDraw.mjs'

// How a Cup round's entrants are paired, given who is in it. ONE implementation shared by the
// played bracket (selectors/tournament) and the pick'em bracket (lib/cupPickem), so a member's
// predicted quarterfinals are paired exactly the way the real ones will be. Relative imports only:
// the pick'em Worker (workers/pickem) bundles this file too, outside Vite's `@/` alias.

export interface Pair<T> {
  a: T
  b: T
}

/**
 * Default pairing: bracket-tree adjacency (entrant i vs entrant i+1). Right for the Round of 18,
 * because the opening round is stored in seeded bracket order (1v36 beside 18v19 — see
 * bracketSlots), and for the rounds after a re-seed, which is placed in bracket order.
 */
export function pairAdjacent<T>(entrants: readonly T[]): Pair<T>[] {
  const pairs: Pair<T>[] = []
  for (let i = 0; i + 1 < entrants.length; i += 2) pairs.push({ a: entrants[i] as T, b: entrants[i + 1] as T })
  return pairs
}

/**
 * Pairing for a re-seeded round: entrants ranked by draw seed, best v worst, in bracket order. A
 * field that isn't a power of two falls back to the plain fold (1vN, 2vN−1, …); a team with no
 * seed (the draw not held) sorts last.
 */
export function pairReseeded(ffuIds: readonly string[], seedOf: ReadonlyMap<string, number>): Pair<string>[] {
  const ranked = [...ffuIds].sort((x, y) => (seedOf.get(x) ?? Infinity) - (seedOf.get(y) ?? Infinity))
  const n = ranked.length
  const powerOfTwo = n > 0 && (n & (n - 1)) === 0
  if (!powerOfTwo) {
    return Array.from({ length: Math.floor(n / 2) }, (_, k) => ({ a: ranked[k]!, b: ranked[n - 1 - k]! }))
  }
  const positions = bracketPositions(n)
  const pairs: Pair<string>[] = []
  for (let i = 0; i < n; i += 2) pairs.push({ a: ranked[positions[i]! - 1]!, b: ranked[positions[i + 1]! - 1]! })
  return pairs
}
