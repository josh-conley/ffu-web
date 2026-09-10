// Conducts the FFU Cup draw and writes the result into public/data/{year}/tournament.json.
//
// The seed is REQUIRED and should be committed publicly before the draw — a number nobody controls
// and nobody knows yet (e.g. "the combined final score of Week 1's Thursday night game"). Anyone can
// then re-run this exact command and diff the result, which is what makes the draw checkable.
//
// Run:
//   npm run draw-cup -- --seed 51 --dry-run          rehearse: print the sheet, write nothing
//   npm run draw-cup -- --seed 51                    conduct it: writes the tournament file
//   npm run draw-cup -- --seed 51 --fixture x.json   rehearse before real draft orders exist
//   npm run draw-cup -- --seed 51 --force            overwrite a draw that was already recorded
//
// A --fixture file is { "PREMIER": [{ "ffuId": "...", "name": "..." }, …], "MASTERS": […],
// "NATIONAL": […] } with PREMIER/MASTERS in draft order — for rehearsing the whole pipeline.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { drawCup } from '../src/lib/cupDraw.mjs'
import { formatDrawSheet } from '../src/lib/drawSheet.mjs'
import { ROOT, TIERS, buildMemberIndex, leagueIdsFor, sleeperApi as api } from './lib/ffuConfig.mjs'

/** National never draws — it is only ever drawn — so its draft order is irrelevant to the Cup. */
const DRAWING_TIERS = ['PREMIER', 'MASTERS']

// ── args ──────────────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, force: false, year: '2026', seed: undefined, fixture: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--force') args.force = true
    else if (arg === '--seed') args.seed = argv[++i]
    else if (arg === '--year') args.year = argv[++i]
    else if (arg === '--fixture') args.fixture = argv[++i]
    else die(`Unknown argument: ${arg}`)
  }
  if (args.seed === undefined || args.seed === '') die('--seed is required (and should be published before the draw)')
  return args
}

function die(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

// ── Sleeper ───────────────────────────────────────────────────────────────────────────────────

/** The league's owners, ordered by draft slot when this tier draws (Premier/Masters). */
async function fetchTierField(tier, leagueId, members) {
  const rosters = await api(`/league/${leagueId}/rosters`)
  const ownerIds = rosters.map((r) => r.owner_id).filter(Boolean)
  if (ownerIds.length !== 12) die(`${tier} has ${ownerIds.length} rostered owners; expected 12`)

  const unmapped = ownerIds.filter((id) => !members.has(id))
  if (unmapped.length > 0) {
    die(`${tier}: ${unmapped.length} Sleeper account(s) are not in src/config/members.ts:\n    ${unmapped.join('\n    ')}`)
  }

  if (!DRAWING_TIERS.includes(tier)) return ownerIds.map((id) => members.get(id))

  const drafts = await api(`/league/${leagueId}/drafts`)
  const draft = drafts.reduce((best, d) => (!best || d.created > best.created ? d : best), undefined)
  const order = draft?.draft_order
  if (!order || Object.keys(order).length !== 12) {
    die(`${tier} draft order is not set yet on Sleeper — the Cup draw needs Premier's and Masters' orders.\n  Rehearse with --fixture until it is.`)
  }
  const missing = ownerIds.filter((id) => order[id] === undefined)
  if (missing.length > 0) die(`${tier}: rostered owners missing from the draft order: ${missing.join(', ')}`)
  return [...ownerIds].sort((a, b) => order[a] - order[b]).map((id) => members.get(id))
}

async function buildField(year, members) {
  const leagueIds = leagueIdsFor(year)
  const field = {}
  for (const tier of TIERS) field[tier] = await fetchTierField(tier, leagueIds[tier], members)
  return field
}

function loadFixture(path) {
  const field = JSON.parse(readFileSync(path, 'utf8'))
  for (const tier of TIERS) if (!Array.isArray(field[tier])) die(`Fixture is missing a ${tier} array`)
  return field
}

// ── output ────────────────────────────────────────────────────────────────────────────────────

/** The draw sheet, in the order ties were made — this is what gets read out in Discord. */
function printSheet(field, result, seed) {
  console.log(`\n${formatDrawSheet(field, result, seed)}`)
}

function writeTournament(year, result, force) {
  const path = join(ROOT, 'public', 'data', year, 'tournament.json')
  const tournament = JSON.parse(readFileSync(path, 'utf8'))
  if (tournament.participants.length > 0 && !force) {
    die(`${year} has already been drawn. Re-drawing discards the recorded bracket — pass --force if that is intended.`)
  }
  if (tournament.fieldSize !== result.participants.length) {
    die(`${year} tournament.json declares fieldSize ${tournament.fieldSize}, but the draw produced ${result.participants.length}`)
  }
  tournament.participants = result.participants
  const opening = tournament.rounds[0]
  if (!opening) die(`${year} tournament.json has no rounds`)
  opening.matchups = result.matchups
  writeFileSync(path, `${JSON.stringify(tournament, null, 2)}\n`)
  console.log(`\n✓ Wrote ${result.participants.length} participants + ${result.matchups.length} opening ties to public/data/${year}/tournament.json`)
  console.log('  Commit it together with the seed, so the draw can be re-run and verified.\n')
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2))
// The shared config/Sleeper helpers throw rather than exiting, so a bad config or a Sleeper outage
// lands here as one friendly line instead of a stack trace.
let field
try {
  field = args.fixture ? loadFixture(args.fixture) : await buildField(args.year, buildMemberIndex())
} catch (error) {
  die(error.message)
}
const result = drawCup(field, args.seed)
printSheet(field, result, args.seed)

if (args.dryRun) console.log('\n(--dry-run: nothing written)\n')
else if (args.fixture) console.log('\n(--fixture: rehearsal only, nothing written)\n')
else writeTournament(args.year, result, args.force)
