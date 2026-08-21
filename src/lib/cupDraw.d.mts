// Types for the plain-ESM draw algorithm. It stays .mjs (not .ts) because `scripts/draw-cup.mjs`
// imports it under bare `node`, which has no TypeScript runner — and there must be exactly ONE
// implementation of the drawing rules, shared by the CLI and the live draw page.

export type CupTier = 'PREMIER' | 'MASTERS' | 'NATIONAL'

export interface DrawTeam {
  ffuId: string
  name: string
}

/** PREMIER and MASTERS must be in DRAFT ORDER; NATIONAL's order is irrelevant (it never draws). */
export type CupField = Record<CupTier, DrawTeam[]>

export interface DrawnParticipant {
  ffuId: string
  tier: CupTier
  seed: number
}

export interface DrawnTie {
  a: string
  b: string
}

export interface CupDrawResult {
  /** Seed-ordered, 1 → 36. */
  participants: DrawnParticipant[]
  /** The 18 opening ties, in the order they were drawn. */
  matchups: DrawnTie[]
  /** Teams in the order they came out of the pool — first drawn is the 36 seed. */
  drawnOrder: DrawTeam[]
}

export function makeRng(seed: string | number): () => number
export function drawCup(field: CupField, seed: string | number): CupDrawResult
