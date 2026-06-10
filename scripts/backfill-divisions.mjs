// Backfill divisions for SLEEPER-era seasons whose legacy snapshot predates division capture
// (the old app only recorded divisions for 2025). Pulls each league's division names + per-roster
// assignments from the public Sleeper API and:
//   1. writes legacy-source/data/divisions-supplement.json  (checked in, merged by migrate-to-v2,
//      so `npm run migrate` reproduces divisions offline without re-fetching)
//   2. patches public/data/{year}/{tier}.json in place (divisions + per-team divisionId)
//   3. flips hasDivisions in public/data/seasons.json
// Idempotent: seasons that already have divisions are skipped.
//
// Run:  node scripts/backfill-divisions.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveId } from './migrate-to-v2.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data')
const SUPPLEMENT = join(ROOT, 'legacy-source', 'data', 'divisions-supplement.json')
const API = 'https://api.sleeper.app/v1'

const api = async (path) => {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`Sleeper ${path} -> ${res.status}`)
  return res.json()
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n')

/** Division names ({ "1": "Diamond", ... }) and per-Sleeper-user assignments for one league. */
async function fetchDivisions(leagueId) {
  const [league, rosters] = await Promise.all([api(`/league/${leagueId}`), api(`/league/${leagueId}/rosters`)])
  const count = league.settings?.divisions ?? 0
  if (count < 2) return null
  const names = {}
  for (let i = 1; i <= count; i++) names[i] = league.metadata?.[`division_${i}`] ?? `Division ${i}`
  const byUser = {}
  for (const r of rosters) {
    const division = r.settings?.division
    if (!r.owner_id || !division) throw new Error(`League ${leagueId}: roster ${r.roster_id} missing owner/division`)
    byUser[r.owner_id] = division
  }
  return { names, byUser }
}

/** Re-keyed team with divisionId in the 2025 position (before placementName) for tidy diffs. */
function withDivisionId(team, divisionId) {
  const { placementName, ...rest } = team
  const patched = { ...rest, divisionId }
  if (placementName !== undefined) patched.placementName = placementName
  return patched
}

function patchSeasonFile(path, season, { names, byUser }) {
  const byMember = new Map(Object.entries(byUser).map(([sleeperId, d]) => [resolveId(sleeperId), d]))
  season.teams = season.teams.map((team) => {
    const divisionId = byMember.get(team.memberId)
    if (!divisionId) throw new Error(`${path}: no division for ${team.memberId}`)
    return withDivisionId(team, divisionId)
  })
  season.divisions = Object.entries(names)
    .map(([id, name]) => ({ id: Number(id), name }))
    .sort((a, b) => a.id - b.id)
  writeJson(path, season)
}

async function run() {
  const manifest = readJson(join(DATA, 'seasons.json'))
  const targets = manifest.seasons.filter((s) => s.era === 'sleeper' && !s.hasDivisions)
  const supplement = {}
  for (const target of targets) {
    const path = join(DATA, target.year, `${target.tier.toLowerCase()}.json`)
    const season = readJson(path)
    const divisions = await fetchDivisions(season.platformLeagueId)
    if (!divisions) {
      console.log(`${target.year} ${target.tier}: no divisions on Sleeper, skipped`)
      continue
    }
    supplement[`${target.year}/${target.tier}`] = divisions
    patchSeasonFile(path, season, divisions)
    target.hasDivisions = true
    console.log(`${target.year} ${target.tier}: ${Object.values(divisions.names).join(' / ')}`)
  }
  if (Object.keys(supplement).length === 0) {
    console.log('Nothing to backfill.')
    return
  }
  writeJson(SUPPLEMENT, supplement)
  writeJson(join(DATA, 'seasons.json'), manifest)
  console.log(`Backfilled ${Object.keys(supplement).length} seasons; supplement → ${SUPPLEMENT}`)
}

await run()
