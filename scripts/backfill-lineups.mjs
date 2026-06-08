// Backfill per-game lineups (starters + bench, with points) for the SLEEPER-era seasons from the
// public Sleeper API, into static files the app lazy-loads:
//   public/data/{year}/{tier}.lineups.json   (per-week TeamLineups)
//   public/data/players.json                 (trimmed id -> {name,position,team}, only appearing ids)
// ESPN-era seasons (<=2020) have no recoverable lineups and are skipped.
//
// Run:  node scripts/backfill-lineups.mjs            (all Sleeper tier-seasons + players map + manifest)
//       node scripts/backfill-lineups.mjs 2024 premier   (single season trial: writes its lineups,
//                                                          prints validation, skips the players map)

import { readFileSync, writeFileSync } from 'node:fs'
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

const zipStarters = (ids, pts) =>
  ids.map((playerId, i) => ({ playerId, points: pts[i] ?? 0 })).filter((s) => s.playerId && s.playerId !== '0')

function benchOf(entry) {
  const starting = new Set(entry.starters ?? [])
  return (entry.players ?? [])
    .filter((id) => id && id !== '0' && !starting.has(id))
    .map((id) => ({ playerId: id, points: entry.players_points?.[id] ?? 0 }))
}

const sum = (arr) => Math.round(arr.reduce((t, s) => t + s.points, 0) * 100) / 100

/** Build one season's WeekLineups[] from Sleeper; collect player ids; warn on score mismatches. */
async function buildSeason(season, ffuMap, ids, warn) {
  const lid = season.platformLeagueId
  const rosters = await api(`/league/${lid}/rosters`)
  const ownerByRoster = new Map(rosters.map((r) => [r.roster_id, r.owner_id]))
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
      for (const s of [...starters, ...bench]) ids.add(s.playerId)
      const got = sum(starters)
      const want = exp[week][memberId]
      if (Math.abs(got - want) > 0.5) warn.push(`${season.year} ${season.tier} wk${week} ${memberId}: starters ${got} vs stored ${want}`)
      teams.push({ memberId, starters, bench })
    }
    out.push({ week, teams })
  }
  return out
}

// ── Players map (trimmed) — fetched once over all collected ids ──
async function writePlayersMap(ids) {
  process.stdout.write(`Fetching Sleeper players map (filtering to ${ids.size} appearing)...\n`)
  const all = await api('/players/nfl')
  const out = {}
  for (const id of ids) {
    const p = all[id]
    if (!p) continue
    const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || id
    out[id] = { name, position: p.position ?? '?', ...(p.team ? { team: p.team } : {}) }
  }
  writeFileSync(join(DATA, 'players.json'), JSON.stringify(out))
  process.stdout.write(`Wrote players.json (${Object.keys(out).length} players)\n`)
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
    const weeks = await buildSeason(season, ffuMap, ids, warn)
    const lineups = { schemaVersion: SCHEMA_VERSION, tier: meta.tier, year: meta.year, weeks }
    writeFileSync(join(DATA, meta.year, `${tierFile}.lineups.json`), JSON.stringify(lineups))
    process.stdout.write(`  -> ${tierFile}.lineups.json (${weeks.length} weeks, ${weeks.reduce((t, w) => t + w.teams.length, 0)} team-weeks)\n`)
  }

  process.stdout.write(warn.length ? `\n⚠ ${warn.length} score mismatches:\n${warn.slice(0, 20).join('\n')}\n` : `\n✓ all starter sums matched stored scores\n`)

  const trial = Boolean(yearArg)
  if (!trial) {
    await writePlayersMap(ids)
    for (const s of manifest.seasons) if (s.era === 'sleeper') s.hasLineups = true
    writeFileSync(join(DATA, 'seasons.json'), JSON.stringify(manifest, null, 2) + '\n')
    process.stdout.write('Updated seasons.json (hasLineups=true for Sleeper seasons)\n')
  } else {
    process.stdout.write(`(trial: skipped players.json + manifest; ${ids.size} unique players seen)\n`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
