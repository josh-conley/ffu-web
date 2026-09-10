// Shared helpers for the Node scripts that read FFU config and talk to Sleeper.
//
// The TS config in src/config is the single source of truth for members and live league ids, but
// these scripts are plain .mjs and cannot import it. Rather than each script re-parsing that file
// its own way (the copy-paste that Charter #3 exists to prevent), the parsing lives here once and
// both scripts/draw-cup.mjs and scripts/refresh-live-season.mjs import it.
//
// Everything here THROWS on failure. Turning an error into a friendly exit is the calling script's
// job, since each one has its own idea of what to tell the operator.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const TIERS = ['PREMIER', 'MASTERS', 'NATIONAL']

const API = 'https://api.sleeper.app/v1'

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
export const writeJson = (path, data) => writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)

/** Extract `export const NAME…= [ … ];` / `= { … }` from TS source and evaluate it as a literal. */
export function evalLiteral(src, name, open, close) {
  const re = new RegExp(`export const ${name}\\b[^=]*=\\s*(\\${open}[\\s\\S]*?\\n\\${close})`)
  const match = src.match(re)
  if (!match) throw new Error(`Could not find ${name} in config`)
  return new Function(`return ${match[1]}`)()
}

/** sleeper user id → { ffuId, name }. Members may hold several accounts (co-owned franchises). */
export function buildMemberIndex() {
  const src = readFileSync(join(ROOT, 'src', 'config', 'members.ts'), 'utf8')
  const index = new Map()
  for (const m of evalLiteral(src, 'MEMBERS', '[', ']')) {
    for (const sleeperId of m.platformIds?.sleeper ?? []) index.set(sleeperId, { ffuId: m.ffuId, name: m.name })
  }
  return index
}

/**
 * The three Sleeper league ids for a year. Looks in liveSeason.ts first (the season being played),
 * then falls back to the SEASONS registry, so a COMPLETED Sleeper season can still be addressed —
 * which is what lets refresh-live-season.mjs verify itself against a year we already have.
 */
export function leagueIdsFor(year) {
  const live = evalLiteral(readFileSync(join(ROOT, 'src', 'config', 'liveSeason.ts'), 'utf8'), 'LIVE_LEAGUE_IDS', '{', '}')[year]
  if (live) return live

  const seasons = evalLiteral(readFileSync(join(ROOT, 'src', 'config', 'seasons.ts'), 'utf8'), 'SEASONS', '[', ']')
  const ids = {}
  for (const s of seasons) if (s.year === year && s.era === 'sleeper') ids[s.tier] = s.platformLeagueId
  if (Object.keys(ids).length === 0) throw new Error(`No Sleeper league ids for ${year} (src/config/liveSeason.ts or seasons.ts)`)
  return ids
}

/** Is `year` the season currently being played, per LIVE_LEAGUE_IDS? */
export function isLiveYear(year) {
  const src = readFileSync(join(ROOT, 'src', 'config', 'liveSeason.ts'), 'utf8')
  return evalLiteral(src, 'LIVE_LEAGUE_IDS', '{', '}')[year] !== undefined
}

export async function sleeperApi(path) {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`Sleeper ${path} → HTTP ${res.status}`)
  return res.json()
}
