// Writes a COMPLETED draft into public/data/{year}/{tier}.draft.json.
//
// Why: a draft is finished the moment the last pick is in — weeks before a single game is played.
// Until this existed, the only 2026 draft board came from the live path in src/data/liveDrafts.ts,
// which polls Sleeper every few seconds to redraw a board that can no longer change. Nothing about
// a draft depends on the season being played, so nothing about it should wait for the season.
//
// Run:
//   npm run backfill-drafts                   the live year's completed drafts
//   npm run backfill-drafts -- --dry-run      report what it would write, write nothing
//   npm run backfill-drafts -- --verify 2025  prove the mapping against a year we already have
//
// A tier whose draft is not yet `complete` on Sleeper is SKIPPED, not written half-finished — the
// live board owns a draft in progress, and this script owns it once it is over.

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, TIERS, buildMemberIndex, leagueIdsFor, readJson, sleeperApi, writeJson } from './lib/ffuConfig.mjs'
import { latestDraft, toDraftData } from './lib/sleeperDraft.mjs'

const DATA = join(ROOT, 'public', 'data')
const SCHEMA_VERSION = 1

function die(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

function parseArgs(argv) {
  const args = { dryRun: false, year: undefined, verify: undefined, force: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--force') args.force = true
    else if (arg === '--year') args.year = argv[++i]
    else if (arg === '--verify') args.verify = argv[++i]
    else die(`Unknown argument: ${arg}`)
  }
  return args
}

/**
 * Sleeper's full player directory, for the college/age a pick payload doesn't carry. Several MB, so
 * it is fetched once per run and only when there is actually a draft to write.
 */
let playersPromise
const allPlayers = () => (playersPromise ??= sleeperApi('/players/nfl'))

/** The completed draft for one tier, or null with a reason when there is nothing to write yet. */
async function buildDraft(tier, year, leagueId, members) {
  const drafts = await sleeperApi(`/league/${leagueId}/drafts`)
  const draft = latestDraft(Array.isArray(drafts) ? drafts : [])
  if (!draft) return { skip: 'no draft exists on Sleeper' }
  if (draft.status !== 'complete') return { skip: `draft is "${draft.status}", not complete — the live board owns it` }

  const picks = await sleeperApi(`/draft/${draft.draft_id}/picks`)
  if (!Array.isArray(picks) || picks.length === 0) return { skip: 'draft reports complete but returned no picks' }
  return { data: toDraftData({ tier, year, draft, picks, members, players: await allPlayers(), schemaVersion: SCHEMA_VERSION }) }
}

/** Flip `hasDraft` on the manifest rows for this year, when the year has rows at all. */
function updateManifest(year, tiers, dryRun) {
  const path = join(DATA, 'seasons.json')
  const manifest = readJson(path)
  let touched = 0
  for (const tier of tiers) {
    const row = manifest.seasons.find((s) => s.tier === tier && s.year === year)
    if (row && row.hasDraft !== true) {
      row.hasDraft = true
      touched++
    }
  }
  if (touched > 0 && !dryRun) writeJson(path, manifest)
  return touched
}

// ── verify ────────────────────────────────────────────────────────────────────────────────────

/** Compare a rebuilt draft against the file already on disk, field by field. */
function diffDraft(built, expected) {
  const problems = []
  // `type` is deliberately not compared. The legacy migration never captured it for Sleeper-era
  // drafts — every 2021–2025 file says "unknown" while Sleeper has always reported "snake" — so a
  // mismatch there is the old data being thinner, not this mapping being wrong. See ai-docs/TODO.md.
  for (const key of ['draftId', 'rounds']) {
    if (String(built[key]) !== String(expected[key])) problems.push(`${key}: built ${built[key]}, expected ${expected[key]}`)
  }
  const orderKey = (o) => Object.entries(o).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(',')
  if (orderKey(built.draftOrder) !== orderKey(expected.draftOrder)) problems.push('draftOrder differs')
  if (built.picks.length !== expected.picks.length) problems.push(`picks: built ${built.picks.length}, expected ${expected.picks.length}`)

  // Compare the FACTS of each pick. college/age come from Sleeper's live directory, which moves as
  // players age and transfer, so they are deliberately not part of the comparison.
  const key = (p) => `${p.overall}|${p.round}|${p.slot}|${p.memberId}|${p.player.id}|${p.player.position}`
  const expectedKeys = new Set(expected.picks.map(key))
  const differing = built.picks.filter((p) => !expectedKeys.has(key(p)))
  if (differing.length > 0) {
    problems.push(`${differing.length} pick(s) differ, e.g. ${differing.slice(0, 3).map(key).join(' / ')}`)
  }
  return problems
}

async function verify(year, members) {
  const leagueIds = leagueIdsFor(year)
  let failures = 0
  for (const tier of TIERS) {
    const path = join(DATA, year, `${tier.toLowerCase()}.draft.json`)
    if (!existsSync(path)) {
      console.log(`  – ${tier}: no ${year} draft file to verify against, skipped`)
      continue
    }
    const { data, skip } = await buildDraft(tier, year, leagueIds[tier], members)
    if (!data) {
      console.log(`  – ${tier}: ${skip}`)
      continue
    }
    const problems = diffDraft(data, readJson(path))
    if (problems.length === 0) {
      console.log(`  ✓ ${tier}: ${data.picks.length} picks match public/data/${year}`)
      continue
    }
    failures++
    console.log(`  ✗ ${tier}:`)
    for (const p of problems) console.log(`      ${p}`)
  }
  if (failures > 0) die(`${failures} tier(s) do not match — this mapping and src/data/liveDrafts.ts have drifted`)
  console.log('\n✓ Draft mapping verified against the existing data.\n')
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const members = buildMemberIndex()
  if (args.verify !== undefined) {
    console.log(`\nVerifying ${args.verify} drafts…\n`)
    return verify(args.verify, members)
  }

  const year = args.year ?? String(new Date().getFullYear())
  const leagueIds = leagueIdsFor(year)
  console.log(`\nBackfilling ${year} drafts…\n`)

  const written = []
  for (const tier of TIERS) {
    const path = join(DATA, year, `${tier.toLowerCase()}.draft.json`)
    if (existsSync(path) && !args.force) {
      console.log(`  – ${tier}: already written (pass --force to replace)`)
      continue
    }
    const { data, skip } = await buildDraft(tier, year, leagueIds[tier], members)
    if (!data) {
      console.log(`  – ${tier}: ${skip}`)
      continue
    }
    if (!args.dryRun) {
      mkdirSync(join(DATA, year), { recursive: true })
      writeJson(path, data)
    }
    written.push(tier)
    console.log(`  ${args.dryRun ? '(dry-run)' : '✓'} ${tier}: ${data.picks.length} picks, ${data.rounds} rounds → public/data/${year}/${tier.toLowerCase()}.draft.json`)
  }

  if (written.length === 0) {
    console.log('\nNothing written.\n')
    return
  }
  const touched = updateManifest(year, written, args.dryRun)
  if (touched > 0) console.log(`  ✓ seasons.json: hasDraft set on ${touched} row(s)`)
  console.log(args.dryRun ? '\n(--dry-run: nothing written)\n' : `\n✓ ${written.length} draft(s) written. Commit the changed files.\n`)
}

main().catch((error) => die(error.message))
