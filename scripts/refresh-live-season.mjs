// Refreshes the IN-PROGRESS season's static data from Sleeper, so the whole site sees it.
//
// Why this exists: LeagueDataProvider only ever reads public/data, and every page above it
// (Stats, Standings, Members, Records, Lineal, the Cup) is built on that one boundary. Until a
// season is backfilled in January it simply does not exist to any of them, which is why the site
// reads "through 2025" for the four months people visit most. Rather than teach every page a
// second, live code path, this writes the season being played into the same files every other
// season uses. Nothing above the data layer changes — 2026 is just another season.
//
// COMPLETED WEEKS ONLY. The current week is deliberately excluded: half of a Sunday's scores are
// still climbing, and a team sitting on 40 points at 2pm would set an all-time low, skew its
// owner's career average, and move the UPR. The home page's This Week section is the place for
// in-progress scores (src/data/liveSleeper.ts, fetched live in the browser); this file is for
// finished games only. That split is the whole reason both can be honest at once.
//
// Run:
//   npm run refresh-season                    the live year, through last completed week
//   npm run refresh-season -- --dry-run       report what it would write, write nothing
//   npm run refresh-season -- --through 3     pin the last completed week (don't ask Sleeper)
//   npm run refresh-season -- --verify 2025   prove the mapping against a season we already have
//
// --verify is the correctness harness: it rebuilds a COMPLETED season straight from Sleeper and
// diffs the regular-season games against the backfilled file already in public/data. If those
// match, the Sleeper→domain mapping here is the same one the migration proved. Run it after any
// change to this script.

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, TIERS, buildMemberIndex, isLiveYear, leagueIdsFor, readJson, sleeperApi, writeJson } from './lib/ffuConfig.mjs'
import { divisionsOf, fixturesForWeek, gamesForWeek, rosterMapOf, teamsFrom } from './lib/sleeperSeason.mjs'

const DATA = join(ROOT, 'public', 'data')
const SCHEMA_VERSION = 1
/** Fallback only — each league states its own `playoff_week_start`, which is what we actually use. */
const DEFAULT_PLAYOFF_WEEK = 15
const MAX_REGULAR_WEEK = DEFAULT_PLAYOFF_WEEK - 1

function die(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

function parseArgs(argv) {
  const args = { dryRun: false, year: undefined, through: undefined, verify: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--year') args.year = argv[++i]
    else if (arg === '--through') args.through = Number(argv[++i])
    else if (arg === '--verify') args.verify = argv[++i]
    else die(`Unknown argument: ${arg}`)
  }
  if (args.through !== undefined && !Number.isInteger(args.through)) die('--through must be a whole week number')
  return args
}

/** The season file for one tier, built from `weeks` completed weeks of Sleeper matchups. */
async function buildSeason(tier, year, leagueId, weeks, members) {
  const [league, rosters] = await Promise.all([sleeperApi(`/league/${leagueId}`), sleeperApi(`/league/${leagueId}/rosters`)])
  const rosterMap = rosterMapOf(rosters, members, tier)
  const divisions = divisionsOf(league, rosters)
  // The league states where its playoffs begin, so the regular-season boundary is data rather than
  // a constant here — a rules change on Sleeper is picked up without touching this script.
  const lastRegular = (league.settings?.playoff_week_start ?? DEFAULT_PLAYOFF_WEEK) - 1
  const regular = weeks.filter((w) => w <= lastRegular)
  const perWeek = await Promise.all(regular.map((w) => sleeperApi(`/league/${leagueId}/matchups/${w}`).then((e) => gamesForWeek(e, w, rosterMap))))
  const games = perWeek.flat()

  // The whole season's fixtures, played or not — Sleeper has every week's pairings from before
  // week 1, so a page can show what is coming instead of nothing.
  const allWeeks = Array.from({ length: lastRegular }, (_, i) => i + 1)
  const perFixtureWeek = await Promise.all(
    allWeeks.map((w) => sleeperApi(`/league/${leagueId}/matchups/${w}`).then((e) => fixturesForWeek(e, w, rosterMap))),
  )
  const schedule = perFixtureWeek.flat()
  return {
    schemaVersion: SCHEMA_VERSION,
    tier,
    year,
    era: 'sleeper',
    platformLeagueId: leagueId,
    teams: teamsFrom(games, rosterMap, divisions),
    games,
    ...(schedule.length > 0 ? { schedule } : {}),
    ...(divisions ? { divisions: divisions.names } : {}),
  }
}

// ── manifest ──────────────────────────────────────────────────────────────────────────────────

/** Add/refresh this year's three rows so the provider can discover the season at all. */
function updateManifest(year, seasons, dryRun) {
  const path = join(DATA, 'seasons.json')
  const manifest = readJson(path)
  for (const season of seasons) {
    const row = {
      tier: season.tier,
      year,
      era: 'sleeper',
      hasDivisions: Array.isArray(season.divisions) && season.divisions.length > 0,
      // False only until the first week is complete — it is what keeps Standings/Matchups from
      // defaulting to a season with nothing in it yet (see useSeasonPicker).
      hasGames: season.games.length > 0,
      hasSchedule: Array.isArray(season.schedule) && season.schedule.length > 0,
      hasDraft: existsSync(join(DATA, year, `${season.tier.toLowerCase()}.draft.json`)),
      hasLineups: existsSync(join(DATA, year, `${season.tier.toLowerCase()}.lineups.json`)),
    }
    const at = manifest.seasons.findIndex((s) => s.tier === row.tier && s.year === row.year)
    if (at === -1) manifest.seasons.push(row)
    else manifest.seasons[at] = row
  }
  if (!dryRun) writeJson(path, manifest)
}

// ── verify: rebuild a completed season and diff it against what we already have ────────────────

function verify(year, built) {
  let mismatches = 0
  for (const season of built) {
    const path = join(DATA, year, `${season.tier.toLowerCase()}.json`)
    if (!existsSync(path)) die(`Nothing to verify against: ${path} does not exist`)
    const expected = readJson(path).games.filter((g) => !g.isPlayoff)
    const key = (g) => `${g.week}|${[...g.participants].map((p) => `${p.memberId}:${p.score}`).sort().join('|')}`
    const have = new Set(expected.map(key))
    const got = new Set(season.games.map(key))
    const missing = [...have].filter((k) => !got.has(k))
    const extra = [...got].filter((k) => !have.has(k))
    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ✓ ${season.tier}: ${season.games.length} regular-season games match public/data/${year}`)
      continue
    }
    mismatches++
    console.log(`  ✗ ${season.tier}: ${missing.length} missing, ${extra.length} unexpected`)
    for (const k of missing.slice(0, 3)) console.log(`      expected but not built: ${k}`)
    for (const k of extra.slice(0, 3)) console.log(`      built but not expected: ${k}`)
  }
  if (mismatches > 0) die(`${mismatches} tier(s) do not match — the Sleeper→domain mapping has drifted`)
  console.log('\n✓ Mapping verified against the backfilled data.\n')
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────

/** Last COMPLETED regular-season week: Sleeper's current week minus the one being played. */
async function lastCompletedWeek(year) {
  const state = await sleeperApi('/state/nfl')
  if (state.season !== year) die(`Sleeper is reporting season ${state.season}, not ${year}. Pass --through to override.`)
  if (state.season_type !== 'regular') return state.season_type === 'post' ? MAX_REGULAR_WEEK : 0
  return Math.min(state.week - 1, MAX_REGULAR_WEEK)
}

/**
 * The data files make the season loadable; SEASONS in src/config/seasons.ts is what makes helpers
 * like tiersForYear and the tier timeline agree it exists. That file is hand-maintained TS, and
 * adding the year before its data exists would 404 the whole site — so this only ever asks.
 */
const isRegistered = (year) => readFileSync(join(ROOT, 'src', 'config', 'seasons.ts'), 'utf8').includes(`year: '${year}'`)

function warnIfUnregistered(year) {
  const seasons = leagueIdsFor(year)
  if (isRegistered(year)) return
  console.log(`  Note: ${year} is not in src/config/seasons.ts yet. Now that its data files exist, add:`)
  for (const tier of Object.keys(seasons)) {
    console.log(`    { tier: '${tier}', year: '${year}', era: 'sleeper', platformLeagueId: '${seasons[tier]}', hasDivisions: true },`)
  }
  console.log('')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const verifying = args.verify !== undefined
  const year = args.verify ?? args.year ?? String(new Date().getFullYear())
  const leagueIds = leagueIdsFor(year)
  const members = buildMemberIndex()

  // Only ever write the season being PLAYED. Any other year has been backfilled the proper way,
  // with playoffs, final placements and Sleeper's own season totals — none of which this script
  // writes — so pointing it at one would quietly replace good data with a regular-season-only
  // subset. The live year is the one LIVE_LEAGUE_IDS names; being in SEASONS is not the test, since
  // the season in progress is registered there from the day its data file lands. Verifying is fine.
  if (!verifying && !args.dryRun && !isLiveYear(year)) {
    die(`${year} is not the season currently being played (src/config/liveSeason.ts). Refreshing a completed season would drop its playoff games and final placements.\n  Use --verify ${year} to check this script against it instead.`)
  }

  const through = args.through ?? (verifying ? MAX_REGULAR_WEEK : await lastCompletedWeek(year))
  if (verifying && through < 1) die(`${year} has no completed weeks to verify against`)

  // Zero completed weeks still writes: the season's teams, divisions and league metadata are facts
  // from the day the commissioner creates the leagues, and only `games` waits for games. The file
  // lands with an empty games array and fills in weekly. Selectors treat a season with no games as
  // not-yet-played (see hasBeenPlayed), so nothing counts it as a season in anyone's career.
  const weeks = Array.from({ length: Math.max(0, Math.min(through, MAX_REGULAR_WEEK)) }, (_, i) => i + 1)
  const scope = weeks.length === 0 ? 'league metadata only (no completed weeks yet)' : `through week ${weeks.length}`
  console.log(`\n${verifying ? 'Verifying' : 'Refreshing'} ${year} — ${scope}…\n`)
  const built = []
  for (const tier of TIERS) built.push(await buildSeason(tier, year, leagueIds[tier], weeks, members))

  if (verifying) return verify(year, built)

  mkdirSync(join(DATA, year), { recursive: true })
  for (const season of built) {
    const path = join(DATA, year, `${season.tier.toLowerCase()}.json`)
    if (!args.dryRun) writeJson(path, season)
    console.log(`  ${args.dryRun ? '(dry-run)' : '✓'} ${season.tier}: ${season.games.length} games, ${season.teams.length} teams → public/data/${year}/${season.tier.toLowerCase()}.json`)
  }
  updateManifest(year, built, args.dryRun)
  const written = Math.max(...built.map((s) => Math.max(0, ...s.games.map((g) => g.week))))
  const summary = written === 0 ? 'league metadata written; games follow once week 1 is complete' : `refreshed through week ${written}`
  console.log(args.dryRun ? '\n(--dry-run: nothing written)\n' : `\n✓ ${year} ${summary}. Commit the changed files.\n`)
  warnIfUnregistered(year)
}

main().catch((error) => die(error.message))
