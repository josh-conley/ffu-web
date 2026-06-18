// Backfill divisions for ESPN-era PREMIER seasons (2018–2020), whose legacy snapshot predates
// division capture (the espn-api pull that recorded them post-dates the original migration).
//
// Mirrors scripts/backfill-divisions.mjs, but the source is an offline espn-api export rather than
// the Sleeper API. It only writes the checked-in supplement; `npm run migrate` then merges it
// (applyDivisionsSupplement) into public/data + flips hasDivisions — one materializer, no dup.
//
// Identity join: the supplement is keyed by legacy userId tokens (resolved to ffuId by migration).
// The new export carries no platform ids, so we join each division team to its legacy standings row
// by `points_for` — an EXACT, unique key (verified) — and read the token off that row. Team names
// (which may have drifted) are used only for human-readable output, never for matching.
//
// Idempotent. Throws loudly on any unmatched/ambiguous team or W-L-T disagreement.
//
// Run:  node scripts/backfill-espn-divisions.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LEGACY = join(ROOT, 'legacy-source', 'data')
const SOURCE = join(LEGACY, 'espn-premier-divisions.json')
const SUPPLEMENT = join(LEGACY, 'divisions-supplement.json')

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
const round2 = (n) => Math.round(n * 100) / 100

/** legacy standings keyed by points_for; throws if two teams share a value (join would be ambiguous). */
function tokensByPoints(year) {
  const legacy = readJson(join(LEGACY, year, 'premier.json'))
  const map = new Map()
  for (const s of legacy.standings) {
    const key = round2(s.pointsFor)
    if (map.has(key)) throw new Error(`${year} PREMIER: duplicate points_for ${key} — join is ambiguous`)
    map.set(key, s)
  }
  return map
}

/** One supplement entry { names, byUser } for a year's four divisions, joined by points_for. */
function buildEntry(year, divisions) {
  const byPoints = tokensByPoints(year)
  const names = {}
  const byUser = {}
  let divisionId = 0
  for (const [divName, teams] of Object.entries(divisions)) {
    divisionId += 1
    names[divisionId] = divName
    for (const t of teams) {
      const s = byPoints.get(round2(t.points_for))
      if (!s) throw new Error(`${year} ${divName}: no legacy team with points_for ${t.points_for} ("${t.team_name}")`)
      if (s.wins !== t.wins || s.losses !== t.losses || (s.ties ?? 0) !== t.ties)
        throw new Error(`${year} "${t.team_name}": W-L-T ${t.wins}-${t.losses}-${t.ties} != legacy ${s.wins}-${s.losses}-${s.ties ?? 0}`)
      byUser[s.userId] = divisionId
    }
  }
  return { names, byUser }
}

function run() {
  const source = readJson(SOURCE)
  const supplement = readJson(SUPPLEMENT)
  for (const [year, divisions] of Object.entries(source)) {
    const key = `${year}/PREMIER`
    supplement[key] = buildEntry(year, divisions)
    console.log(`${key}: ${Object.values(supplement[key].names).join(' / ')}`)
  }
  writeJson(SUPPLEMENT, supplement)
  console.log(`Wrote ${Object.keys(source).length} ESPN entries → ${SUPPLEMENT}. Run \`npm run migrate\` to materialize.`)
}

run()
