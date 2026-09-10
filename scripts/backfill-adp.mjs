// Snapshots Sleeper's half-PPR ADP for a season into public/data/{year}/adp.json.
//
// Why store it rather than read it live: ADP is a market, and it keeps moving after the drafts are
// over — by midseason Sleeper's number reflects a board nobody drafted from. What the comparison
// page needs is the ADP as it stood around draft time, so this takes a dated snapshot and the file
// becomes the record. Re-running replaces it, which is why it refuses without --force.
//
// Half PPR because that is what the leagues score (`scoring_settings.rec` is 0.5 on all three,
// verified 2026-09-09). If that ever changes, change FORMAT below to match — `adp_ppr`, `adp_std`
// and `adp_2qb` are all in the same payload.
//
// The endpoint is Sleeper's projections API, which is undocumented but is what their own draft
// board reads. It is not part of the documented v1 API, so treat a shape change as expected
// someday: the script fails loudly rather than writing a file full of nulls.
//
// Run:
//   npm run backfill-adp                 the live year
//   npm run backfill-adp -- --dry-run    report what it would write
//   npm run backfill-adp -- --force      replace an existing snapshot

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, TIERS, leagueIdsFor, readJson, writeJson } from './lib/ffuConfig.mjs'

const DATA = join(ROOT, 'public', 'data')
const SCHEMA_VERSION = 1
const FORMAT = 'half_ppr'
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
/** Sleeper parks undrafted/irrelevant players at 999; anything at or above this is "no ADP". */
const NO_ADP = 900

function die(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

function parseArgs(argv) {
  const args = { dryRun: false, force: false, year: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--force') args.force = true
    else if (arg === '--year') args.year = argv[++i]
    else die(`Unknown argument: ${arg}`)
  }
  return args
}

async function fetchAdp(year) {
  const query = POSITIONS.map((p) => `position[]=${p}`).join('&')
  const url = `https://api.sleeper.com/projections/nfl/${year}?season_type=regular&${query}&order_by=adp_${FORMAT}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sleeper projections → HTTP ${res.status}`)
  const rows = await res.json()
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Sleeper projections returned no rows')

  const adp = new Map()
  for (const row of rows) {
    const value = row?.stats?.[`adp_${FORMAT}`]
    if (typeof value !== 'number' || value >= NO_ADP) continue
    adp.set(String(row.player_id), value)
  }
  if (adp.size === 0) throw new Error(`No adp_${FORMAT} values in the payload — the shape has probably changed`)
  return adp
}

/** Player ids drafted in `year`, so the snapshot carries only players the comparison can use. */
function draftedIds(year) {
  const ids = new Set()
  for (const tier of TIERS) {
    const path = join(DATA, year, `${tier.toLowerCase()}.draft.json`)
    if (!existsSync(path)) continue
    for (const pick of readJson(path).picks) ids.add(String(pick.player.id))
  }
  return ids
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const year = args.year ?? String(new Date().getFullYear())
  leagueIdsFor(year) // fails loudly if the year isn't one we know about

  const path = join(DATA, year, 'adp.json')
  if (existsSync(path) && !args.force) {
    die(`${year} already has an ADP snapshot. It is a dated record of the draft-season market, so replacing it loses that — pass --force if that is intended.`)
  }

  const drafted = draftedIds(year)
  if (drafted.size === 0) die(`No ${year} draft files found. ADP is only useful next to picks — run \`npm run backfill-drafts\` first.`)

  console.log(`\nFetching Sleeper ${FORMAT} ADP for ${year}…\n`)
  const adp = await fetchAdp(year)

  const kept = {}
  const missing = []
  for (const id of drafted) {
    if (adp.has(id)) kept[id] = adp.get(id)
    else missing.push(id)
  }

  console.log(`  ${Object.keys(kept).length} of ${drafted.size} drafted players have an ADP`)
  if (missing.length > 0) console.log(`  ${missing.length} without one (undrafted in the wider market): ${missing.slice(0, 5).join(', ')}`)

  const file = {
    schemaVersion: SCHEMA_VERSION,
    year,
    source: 'sleeper',
    format: FORMAT,
    // The snapshot's date is part of the data: ADP moves, and a reader should know when this was true.
    capturedAt: new Date().toISOString().slice(0, 10),
    adp: kept,
  }
  if (args.dryRun) {
    console.log('\n(--dry-run: nothing written)\n')
    return
  }
  mkdirSync(join(DATA, year), { recursive: true })
  writeJson(path, file)
  console.log(`\n✓ Wrote public/data/${year}/adp.json (captured ${file.capturedAt}). Commit it.\n`)
}

main().catch((error) => die(error.message))
