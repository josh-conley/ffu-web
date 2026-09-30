// Draw-sheet formatting, shared by the CLI (`scripts/draw-cup.mjs`) and the live draw page, so the
// text read out on stream, the file downloaded from the page, and the terminal output are the same
// bytes. Pure string building — no I/O, no DOM.

import { drawCheckCode } from './cupDraw.mjs'

const LABEL = { PREMIER: 'PL', MASTERS: 'ML', NATIONAL: 'NL' }

/**
 * Characters a seed may use. Deliberately narrow: every one is literal inside double quotes in
 * both POSIX shells and Windows cmd, so the command below can be pasted anywhere and re-run the
 * exact draw. A seed like "week4 SNF 51" is fine; `$`, quotes and backslashes are not.
 */
export const SEED_PATTERN = /^[A-Za-z0-9 _.:#-]+$/

/** The command that reproduces a draw and writes the official file. Quoted whenever it has a space. */
export function drawCommand(seed) {
  const s = String(seed)
  return `npm run draw-cup -- --seed ${/^[A-Za-z0-9_.:#-]+$/.test(s) ? s : `"${s}"`}`
}

/** Lookup helpers built once from a field + result, so each formatter stays a simple map. */
function index(field, result) {
  const nameOf = new Map()
  for (const tier of ['PREMIER', 'MASTERS', 'NATIONAL']) for (const t of field[tier]) nameOf.set(t.ffuId, t.name)
  return {
    nameOf,
    seedOf: new Map(result.participants.map((p) => [p.ffuId, p.seed])),
    tierOf: new Map(result.participants.map((p) => [p.ffuId, p.tier])),
  }
}

/** The human-readable sheet: the matchups in the order drawn, then the full 1–36 seeding. */
export function formatDrawSheet(field, result, seed) {
  const { nameOf, seedOf, tierOf } = index(field, result)
  const side = (id) => `${nameOf.get(id)} (${LABEL[tierOf.get(id)]}, ${seedOf.get(id)})`

  const lines = [`FFU CUP — ROUND OF 36 DRAW`, `Seed: ${seed}`, `Check: ${drawCheckCode(result)}`, '']
  result.matchups.forEach((m, i) => {
    if (i === 12) lines.push('  — Masters draws the remaining National teams —')
    lines.push(`  ${String(i + 1).padStart(2)}. ${side(m.a)}  v  ${side(m.b)}`)
  })
  lines.push('', 'SEEDS')
  for (const p of result.participants) {
    lines.push(`  ${String(p.seed).padStart(2)}. ${nameOf.get(p.ffuId)} (${LABEL[p.tier]})`)
  }
  return lines.join('\n')
}

/** One row per matchup, for a spreadsheet. */
export function formatDrawCsv(field, result, seed) {
  const { nameOf, seedOf, tierOf } = index(field, result)
  const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
  const rows = [['matchup', 'seed_a', 'team_a', 'league_a', 'seed_b', 'team_b', 'league_b', 'draw_seed']]
  result.matchups.forEach((m, i) => {
    rows.push([
      i + 1,
      seedOf.get(m.a), nameOf.get(m.a), LABEL[tierOf.get(m.a)],
      seedOf.get(m.b), nameOf.get(m.b), LABEL[tierOf.get(m.b)],
      seed,
    ])
  })
  return rows.map((r) => r.map(cell).join(',')).join('\n')
}
