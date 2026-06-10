// Phase 1 migration: legacy ffu-app season files → normalized v2 schema (src/data/types.ts).
//
// Reads the throwaway legacy-source/ snapshot, collapses dual IDs onto a single `ffuId`
// (incl. the Team Dogecoin co-owner merge), and emits one file per tier-season + drafts +
// a manifest into public/data. NOT trusted until scripts/validate-migration.mjs is zero-diff.
//
// Run: npm run migrate    (plain node; no deps, no TS runner)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LEGACY = join(ROOT, 'legacy-source')
const OUT = join(ROOT, 'public', 'data')

const SCHEMA_VERSION = 1
const TIERS = ['PREMIER', 'MASTERS', 'NATIONAL']

/**
 * Canonical-id merges (co-owned franchises split across accounts). Confirmed with user:
 * Team Dogecoin keeps ffu-031 (2020 originator); ffu-032's Sleeper account folds in.
 */
const MERGES = { 'ffu-032': 'ffu-031' }

// ── Read the legacy ID registry out of constants.ts (plan: it IS the migration's ID map) ──

/** Extract `export const NAME: T[] = [ ... ];` and eval the array literal (plain object data). */
function evalArrayLiteral(src, name) {
  const re = new RegExp(`export const ${name}\\b[^=]*=\\s*(\\[[\\s\\S]*?\\n\\]);`)
  const m = src.match(re)
  if (!m) throw new Error(`Could not find ${name} in legacy constants.ts`)
  return new Function(`return ${m[1]}`)()
}

const legacyConstants = readFileSync(join(LEGACY, 'constants.ts'), 'utf8')
const USERS = evalArrayLiteral(legacyConstants, 'USERS')

/** legacy userId token (real sleeperId OR "historical-*") → canonical ffuId. */
function buildResolver() {
  const map = new Map()
  for (const u of USERS) {
    const ffuId = MERGES[u.ffuId] ?? u.ffuId
    map.set(u.sleeperId, ffuId)
  }
  return map
}
const RESOLVER = buildResolver()

function resolveId(token) {
  const ffuId = RESOLVER.get(token)
  if (!ffuId) throw new Error(`Unmapped legacy userId token: ${token}`)
  return ffuId
}

// ── Era metadata (folded in at migration time; readers consume metadata, never branch) ──

function eraFor(year) {
  return Number(year) <= 2020 ? 'espn' : 'sleeper'
}
function playoffWeeksFor(year) {
  return eraFor(year) === 'espn' ? [14, 15, 16] : [15, 16, 17]
}
function seasonLengthFor(year) {
  return eraFor(year) === 'espn' ? 16 : 17
}
function regularSeasonWeeks(year) {
  const first = Math.min(...playoffWeeksFor(year))
  return new Set(Array.from({ length: first - 1 }, (_, i) => i + 1))
}

/** Classify a legacy placementType into a bracket. `round` keeps the exact label (lossless). */
function bracketFor(placementType) {
  if (!placementType) return undefined
  if (/Toilet Bowl|Last Place/.test(placementType)) return 'consolation'
  if (/Place$/.test(placementType)) return 'placement'
  if (/Championship|Semifinal|Quarterfinal/.test(placementType)) return 'championship'
  return undefined
}

function normalizeDraftType(raw) {
  const t = String(raw ?? '').toLowerCase()
  return ['snake', 'auction', 'linear'].includes(t) ? t : 'unknown'
}

// ── Transforms ──────────────────────────────────────────────────────────────────────

function buildTeams(legacy) {
  const placements = new Map((legacy.playoffResults ?? []).map((p) => [p.userId, p]))
  const promoted = new Set(legacy.promotions ?? [])
  const relegated = new Set(legacy.relegations ?? [])

  return legacy.standings.map((s) => {
    const pr = placements.get(s.userId)
    const team = {
      memberId: resolveId(s.userId),
      // Sleeper's authoritative season aggregates, preserved verbatim as facts (Sleeper provides
      // these directly; the per-game sum can differ by a few pts — see data/types.ts). W-L-T
      // always matches the games.
      record: { wins: s.wins, losses: s.losses, ties: s.ties ?? 0 },
      points: { for: s.pointsFor, against: s.pointsAgainst },
      // `rank` IS the final post-playoff placement (== playoffResults.placement in all data);
      // NOT a regular-season seed. The regular-season seed is derived, not stored.
      finalPlacement: s.rank,
      promoted: promoted.has(s.userId),
      relegated: relegated.has(s.userId),
    }
    if (s.division != null) team.divisionId = s.division
    if (pr?.placementName) team.placementName = pr.placementName
    return team
  })
}

function buildGames(legacy) {
  const playoffWeeks = new Set(playoffWeeksFor(legacy.year))
  const games = []
  for (const [weekStr, matchups] of Object.entries(legacy.matchupsByWeek)) {
    const week = Number(weekStr)
    for (const m of matchups) {
      const game = {
        week,
        isPlayoff: playoffWeeks.has(week),
        participants: [
          { memberId: resolveId(m.winner), score: m.winnerScore },
          { memberId: resolveId(m.loser), score: m.loserScore },
        ],
      }
      if (m.placementType) {
        game.round = m.placementType
        const bracket = bracketFor(m.placementType)
        if (bracket) game.bracket = bracket
      }
      games.push(game)
    }
  }
  return games
}

function buildDivisions(legacy) {
  if (!legacy.divisionNames) return undefined
  return Object.entries(legacy.divisionNames)
    .map(([id, name]) => ({ id: Number(id), name }))
    .sort((a, b) => a.id - b.id)
}

// Divisions for Sleeper seasons the legacy snapshot missed (it only captured 2025), fetched once
// from the Sleeper API by scripts/backfill-divisions.mjs and checked in so migration stays offline.
let DIVISIONS_SUPPLEMENT = {}
try {
  DIVISIONS_SUPPLEMENT = JSON.parse(readFileSync(join(LEGACY, 'data', 'divisions-supplement.json'), 'utf8'))
} catch {
  /* supplement not generated yet — seasons fall back to legacy-only division data */
}

/** Apply supplement divisions (names + per-team divisionId) when legacy carried none. */
function applyDivisionsSupplement(season) {
  const extra = DIVISIONS_SUPPLEMENT[`${season.year}/${season.tier}`]
  if (!extra || season.divisions) return
  const byMember = new Map(Object.entries(extra.byUser).map(([sleeperId, d]) => [resolveId(sleeperId), d]))
  season.teams = season.teams.map((team) => {
    const divisionId = byMember.get(team.memberId)
    if (!divisionId) throw new Error(`Supplement missing division for ${team.memberId} (${season.year} ${season.tier})`)
    const { placementName, ...rest } = team
    return placementName !== undefined ? { ...rest, divisionId, placementName } : { ...rest, divisionId }
  })
  season.divisions = Object.entries(extra.names)
    .map(([id, name]) => ({ id: Number(id), name }))
    .sort((a, b) => a.id - b.id)
}

function buildSeason(legacy) {
  const season = {
    schemaVersion: SCHEMA_VERSION,
    tier: legacy.league,
    year: String(legacy.year),
    era: eraFor(legacy.year),
    platformLeagueId: legacy.leagueId,
    teams: buildTeams(legacy),
    games: buildGames(legacy),
  }
  const divisions = buildDivisions(legacy)
  if (divisions) season.divisions = divisions
  applyDivisionsSupplement(season)
  return season
}

function buildDraft(legacy) {
  const dd = legacy.draftData
  if (!dd || !(dd.picks ?? []).length) return null
  const draftOrder = {}
  for (const [token, slot] of Object.entries(dd.draftOrder ?? {})) {
    draftOrder[resolveId(token)] = slot
  }
  const picks = dd.picks.map((p) => {
    const info = p.playerInfo ?? {}
    const player = { id: String(p.playerId), name: info.name, position: info.position }
    if (info.team) player.nflTeam = info.team
    if (info.college) player.college = info.college
    if (info.age != null) player.age = info.age
    return {
      overall: p.pickNumber,
      round: p.round,
      slot: p.draftSlot,
      memberId: resolveId(p.pickedBy),
      player,
    }
  })
  return {
    schemaVersion: SCHEMA_VERSION,
    tier: legacy.league,
    year: String(legacy.year),
    draftId: dd.draftId,
    type: normalizeDraftType(dd.settings?.draftType),
    rounds: dd.settings?.rounds ?? Math.max(...picks.map((p) => p.round)),
    draftOrder,
    picks,
  }
}

// ── Drive ────────────────────────────────────────────────────────────────────────────

function legacyYears() {
  return readdirSync(join(LEGACY, 'data'))
    .filter((d) => /^\d{4}$/.test(d))
    .sort()
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

function run() {
  const manifest = { schemaVersion: SCHEMA_VERSION, seasons: [] }
  let seasonCount = 0
  let draftCount = 0

  for (const year of legacyYears()) {
    for (const tier of TIERS) {
      const file = join(LEGACY, 'data', year, `${tier.toLowerCase()}.json`)
      let legacy
      try {
        legacy = JSON.parse(readFileSync(file, 'utf8'))
      } catch {
        continue // tier didn't exist this year (e.g. Masters pre-2022)
      }

      const season = buildSeason(legacy)
      writeJson(join(OUT, year, `${tier.toLowerCase()}.json`), season)
      seasonCount++

      const draft = buildDraft(legacy)
      if (draft) {
        writeJson(join(OUT, year, `${tier.toLowerCase()}.draft.json`), draft)
        draftCount++
      }

      // Lineups are produced by scripts/backfill-lineups.mjs, not migration — detect the files so
      // re-running migration doesn't clobber the manifest flags.
      let hasLineups = true
      try {
        readFileSync(join(OUT, year, `${tier.toLowerCase()}.lineups.json`))
      } catch {
        hasLineups = false
      }

      manifest.seasons.push({
        tier,
        year,
        era: season.era,
        hasDivisions: Boolean(season.divisions),
        hasDraft: Boolean(draft),
        hasLineups,
      })
    }
  }

  writeJson(join(OUT, 'seasons.json'), manifest)
  console.log(`Migrated ${seasonCount} seasons, ${draftCount} drafts → ${OUT}`)
}

// Only migrate when invoked directly; the validation harness imports helpers below.
const isMain = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) run()

// Exported for the validation harness so both sides share one source of truth.
export { eraFor, playoffWeeksFor, seasonLengthFor, regularSeasonWeeks, RESOLVER, resolveId, MERGES }
