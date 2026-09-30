import type { CupDrawResult, CupField } from './cupDraw.mjs'

/** Human-readable draw sheet: matchups in the order drawn, then the full 1–36 seeding. */
export function formatDrawSheet(field: CupField, result: CupDrawResult, seed: string | number): string

/** One CSV row per matchup. */
export function formatDrawCsv(field: CupField, result: CupDrawResult, seed: string | number): string

/** Characters a seed may use: all literal inside double quotes in any shell. */
export const SEED_PATTERN: RegExp

/** `npm run draw-cup -- --seed …`, quoted when the seed has a space. */
export function drawCommand(seed: string | number): string
