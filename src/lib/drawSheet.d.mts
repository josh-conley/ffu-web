import type { CupDrawResult, CupField } from './cupDraw.mjs'

/** Human-readable draw sheet: ties in the order drawn, then the full 1–36 seeding. */
export function formatDrawSheet(field: CupField, result: CupDrawResult, seed: string | number): string

/** One CSV row per tie. */
export function formatDrawCsv(field: CupField, result: CupDrawResult, seed: string | number): string
