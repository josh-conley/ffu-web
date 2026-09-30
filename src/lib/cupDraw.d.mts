// Types for the plain-ESM draw algorithm. It stays .mjs (not .ts) because `scripts/draw-cup.mjs`
// imports it under bare `node`, which has no TypeScript runner — and there must be exactly ONE
// implementation of the drawing rules, shared by the CLI and the live draw page.

export type CupTier = 'PREMIER' | 'MASTERS' | 'NATIONAL'

export interface DrawTeam {
  ffuId: string
  name: string
}

/** PREMIER and MASTERS must be in DRAFT ORDER; NATIONAL may be in any order (drawCup sorts it). */
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
/** Short fingerprint of the drawn matchups, e.g. "3F2A-9C01" — the same on the page and in the CLI. */
export function drawCheckCode(result: CupDrawResult): string

/**
 * Draw-order indices of the matchups, in BRACKET order (adjacent pairs meet next round), seeded so
 * the winner of 1v36 meets the winner of 18v19, 2v35 meets 17v20, and so on.
 */
export function bracketSlots(result: CupDrawResult): number[]
