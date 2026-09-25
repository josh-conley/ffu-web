// Backfill per-game lineups (starters + bench, with points) for the SLEEPER-era seasons from the
// public Sleeper API, into static files the app lazy-loads:
//   public/data/{year}/{tier}.lineups.json   (per-week TeamLineups)
//   public/data/players.json                 (trimmed id -> {name,position,team}, only appearing ids)
// ESPN-era seasons (<=2020) have no recoverable lineups and are skipped.
//
// Run:  node scripts/backfill-lineups.mjs            (all Sleeper tier-seasons)
//       node scripts/backfill-lineups.mjs 2026          (one year — what the weekly refresh runs)
//       node scripts/backfill-lineups.mjs 2024 premier  (one tier-season)
//
// Every run writes the lineups it built, merges the players it saw into players.json, and marks
// those tier-seasons `hasLineups` in the manifest. A narrowed run therefore leaves the seasons it
// didn't touch exactly as they were: players.json is merged rather than replaced, because a subset
// run that rewrote it wholesale would drop every player the other seasons depend on.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data')
const API = 'https://api.sleeper.app/v1'
const SCHEMA_VERSION = 1

const api = async (path) => {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`Sleeper ${path} -> ${res.status}`)
  return res.json()
}

// ── Season-accurate NFL teams from NFLverse weekly rosters (matched by sleeper_id) ──
const NFLVERSE = (year) => `https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_${year}.csv`

/** Quote-aware CSV line split (fields can contain commas inside double quotes). */
function splitCsv(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"') (line[i + 1] === '"' ? ((cur += '"'), i++) : (q = false))
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') (out.push(cur), (cur = ''))
    else cur += ch
  }
  out.push(cur)
  return out
}

const rosterCache = new Map()
/** year → { byWeek: Map<week, Map<sleeperId, team>>, season: Map<sleeperId, team> } */
async function weeklyTeams(year) {
  if (rosterCache.has(year)) return rosterCache.get(year)
  const res = await fetch(NFLVERSE(year), { redirect: 'follow' })
  if (!res.ok) throw new Error(`NFLverse ${year} -> ${res.status}`)
  const lines = (await res.text()).split('\n')
  const h = splitCsv(lines[0])
  const ci = { team: h.indexOf('team'), week: h.indexOf('week'), sid: h.indexOf('sleeper_id') }
  const byWeek = new Map()
  const season = new Map()
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue
    const c = splitCsv(lines[i])
    const sid = c[ci.sid]
    const team = c[ci.team]
    if (!sid || !team) continue
    const wk = Number(c[ci.week])
    if (!byWeek.has(wk)) byWeek.set(wk, new Map())
    byWeek.get(wk).set(sid, team)
    season.set(sid, team) // last-seen fallback for weeks a player is missing
  }
  const result = { byWeek, season }
  rosterCache.set(year, result)
  return result
}

const isDefId = (id) => /^[A-Z]{2,4}$/.test(id) // Sleeper team-defense ids are the team abbr

// ── sleeper owner id -> ffuId, parsed from the permanent config (merges already applied there) ──
function sleeperToFfu() {
  const src = readFileSync(join(ROOT, 'src', 'config', 'members.ts'), 'utf8')
  const m = src.match(/export const MEMBERS\b[^=]*=\s*(\[[\s\S]*?\n\])/)
  if (!m) throw new Error('Could not find MEMBERS in src/config/members.ts')
  const members = new Function(`return ${m[1]}`)()
  const map = new Map()
  for (const mem of members) for (const sid of mem.platformIds?.sleeper ?? []) map.set(sid, mem.ffuId)
  return map
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

/** expected[week][memberId] = stored game score, for validating starter sums. */
function expectedScores(season) {
  const exp = {}
  for (const g of season.games) {
    for (const p of g.participants) (exp[g.week] ??= {})[p.memberId] = p.score
  }
  return exp
}

// Sleeper marks an empty starting slot with player id "0". It stays in the list as `null` so every
// later starter keeps its own slot (dropping it shifted them all up one).
const zipStarters = (ids, pts) => ids.map((playerId, i) => (playerId && playerId !== '0' ? { playerId, points: pts[i] ?? 0 } : null))

function benchOf(entry) {
  const starting = new Set(entry.starters ?? [])
  return (entry.players ?? [])
    .filter((id) => id && id !== '0' && !starting.has(id))
    .map((id) => ({ playerId: id, points: entry.players_points?.[id] ?? 0 }))
}

const sum = (arr) => Math.round(arr.reduce((t, s) => t + s.points, 0) * 100) / 100

const BENCH_SLOTS = new Set(['BN', 'IR', 'TAXI'])

/** Build one season's lineups from Sleeper; collect player ids; warn on score mismatches. */
async function buildSeason(season, ffuMap, ids, warn) {
  const lid = season.platformLeagueId
  const league = await api(`/league/${lid}`)
  const slots = (league.roster_positions ?? []).filter((s) => !BENCH_SLOTS.has(s))
  const rosters = await api(`/league/${lid}/rosters`)
  const ownerByRoster = new Map(rosters.map((r) => [r.roster_id, r.owner_id]))
  const roster = await weeklyTeams(Number(season.year))
  const teamFor = (id, week) => (isDefId(id) ? id : roster.byWeek.get(week)?.get(id) ?? roster.season.get(id))
  const exp = expectedScores(season)
  const weeks = [...new Set(season.games.map((g) => g.week))].sort((a, b) => a - b)

  const out = []
  for (const week of weeks) {
    const entries = await api(`/league/${lid}/matchups/${week}`)
    const teams = []
    for (const e of entries) {
      const memberId = ffuMap.get(ownerByRoster.get(e.roster_id))
      if (!memberId || exp[week]?.[memberId] === undefined) continue // not in one of our games this week
      const starters = zipStarters(e.starters ?? [], e.starters_points ?? [])
      const bench = benchOf(e)
      for (const s of [...starters.filter(Boolean), ...bench]) {
        ids.add(s.playerId)
        const t = teamFor(s.playerId, week)
        if (t) s.team = t
      }
      const got = sum(starters.filter(Boolean))
      const want = exp[week][memberId]
      if (Math.abs(got - want) > 0.5) warn.push(`${season.year} ${season.tier} wk${week} ${memberId}: starters ${got} vs stored ${want}`)
      teams.push({ memberId, starters, bench })
    }
    out.push({ week, teams })
  }
  return { slots, weeks: out }
}

// ── Players map (trimmed) — fetched once over all collected ids ──

/** Merge the ids this run saw into players.json, keeping everyone already in it. Only fetches
 *  Sleeper's (large) players map when there is at least one id we don't already know. */
async function writePlayersMap(ids) {
  const path = join(DATA, 'players.json')
  const existing = existsSync(path) ? readJson(path) : {}
  const missing = [...ids].filter((id) => existing[id] === undefined)
  if (missing.length === 0) {
    process.stdout.write(`players.json already covers all ${ids.size} players seen\n`)
    return
  }
  process.stdout.write(`Fetching Sleeper players map (${missing.length} new of ${ids.size} seen)...\n`)
  const all = await api('/players/nfl')
  const out = { ...existing }
  for (const id of missing) {
    const p = all[id]
    if (!p) continue
    const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || id
    out[id] = { name, position: p.position ?? '?' } // team is per-lineup (season-accurate), not here
  }
  writeFileSync(path, JSON.stringify(out))
  process.stdout.write(`Wrote players.json (${Object.keys(out).length} players, +${Object.keys(out).length - Object.keys(existing).length})\n`)
}

async function main() {
  const [yearArg, tierArg] = process.argv.slice(2)
  const ffuMap = sleeperToFfu()
  const manifest = readJson(join(DATA, 'seasons.json'))
  let targets = manifest.seasons.filter((s) => s.era === 'sleeper')
  if (yearArg) targets = targets.filter((s) => s.year === yearArg && (!tierArg || s.tier.toLowerCase() === tierArg.toLowerCase()))
  if (targets.length === 0) throw new Error('No matching Sleeper tier-seasons')

  const ids = new Set()
  const warn = []
  for (const meta of targets) {
    const tierFile = meta.tier.toLowerCase()
    const season = readJson(join(DATA, meta.year, `${tierFile}.json`))
    process.stdout.write(`${meta.year} ${meta.tier}: league ${season.platformLeagueId} ...\n`)
    const { slots, weeks } = await buildSeason(season, ffuMap, ids, warn)
    const lineups = { schemaVersion: SCHEMA_VERSION, tier: meta.tier, year: meta.year, slots, weeks }
    writeFileSync(join(DATA, meta.year, `${tierFile}.lineups.json`), JSON.stringify(lineups))
    process.stdout.write(`  -> ${tierFile}.lineups.json (slots: ${slots.join('/')}; ${weeks.length} weeks)\n`)
  }

  process.stdout.write(warn.length ? `\n⚠ ${warn.length} score mismatches:\n${warn.slice(0, 20).join('\n')}\n` : `\n✓ all starter sums matched stored scores\n`)

  await writePlayersMap(ids)
  const written = new Set(targets.map((t) => `${t.year}|${t.tier}`))
  for (const s of manifest.seasons) if (written.has(`${s.year}|${s.tier}`)) s.hasLineups = true
  writeFileSync(join(DATA, 'seasons.json'), JSON.stringify(manifest, null, 2) + '\n')
  process.stdout.write(`Updated seasons.json (hasLineups=true for ${written.size} tier-season(s))\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
