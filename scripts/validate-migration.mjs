// Phase 1 validation harness: prove the migration is LOSSLESS before any UI trusts it.
//
// For every tier-season it diffs the new v2 files against legacy-source/, in ffuId space:
//   • per-game: every legacy matchup ↔ exactly one new game, same members + same scores
//   • stored team fields: seed, record, points, finalPlacement/placementName, promoted/relegated
//   • derived high/low: regular-season high/low recomputed from new games == legacy standings
//   • drafts: pick count, draftOrder size, and per-pick player/owner mapping
// Zero diffs required (exit 0). Also prints the co-owner merge report.
//
// Run: npm run validate

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveId, MERGES } from './migrate-to-v2.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LEGACY = join(ROOT, 'legacy-source', 'data')
const OUT = join(ROOT, 'public', 'data')
const TIERS = ['premier', 'masters', 'national']

const diffs = []
const fail = (ctx, msg) => diffs.push(`${ctx}: ${msg}`)
// Known legacy glitches: stored standings points that drifted from their own game scores.
// Games are authoritative; recorded here for transparency, not treated as failures.
const pointsDrift = []
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const round2 = (n) => Math.round(n * 100) / 100

/** Regular-season W-L-T + points per member, derived from the NEW games (the source of truth). */
function deriveRegularTotals(season) {
  const totals = new Map()
  for (const g of season.games) {
    if (g.isPlayoff) continue
    const [a, b] = g.participants
    if (!a || !b) continue
    for (const [self, opp] of [[a, b], [b, a]]) {
      const t = totals.get(self.memberId) ?? { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 }
      t.pf += self.score
      t.pa += opp.score
      if (self.score > opp.score) t.wins += 1
      else if (self.score < opp.score) t.losses += 1
      else t.ties += 1
      totals.set(self.memberId, t)
    }
  }
  return totals
}

// ── Per-game: legacy matchups ↔ new games (member-set + scores), 1:1 ──────────────────

function gameKey(memberIds) {
  return [...memberIds].sort().join('|')
}

function validateGames(ctx, legacy, season) {
  // Index new games by week → list of { members:Map(memberId→score), used:false }.
  const byWeek = new Map()
  for (const g of season.games) {
    const scores = new Map(g.participants.map((p) => [p.memberId, p.score]))
    if (g.participants.length !== 2) fail(ctx, `game wk${g.week} has ${g.participants.length} participants`)
    ;(byWeek.get(g.week) ?? byWeek.set(g.week, []).get(g.week)).push({ scores, used: false })
  }

  let legacyCount = 0
  for (const [weekStr, matchups] of Object.entries(legacy.matchupsByWeek)) {
    const week = Number(weekStr)
    for (const m of matchups) {
      legacyCount++
      const wId = resolveId(m.winner)
      const lId = resolveId(m.loser)
      const candidates = byWeek.get(week) ?? []
      const match = candidates.find(
        (c) => !c.used && c.scores.has(wId) && c.scores.has(lId) && gameKey(c.scores.keys()) === gameKey([wId, lId]),
      )
      if (!match) {
        fail(ctx, `wk${week} legacy matchup ${wId} vs ${lId} has no new game`)
        continue
      }
      match.used = true
      if (round2(match.scores.get(wId)) !== round2(m.winnerScore))
        fail(ctx, `wk${week} ${wId} score ${match.scores.get(wId)} != legacy ${m.winnerScore}`)
      if (round2(match.scores.get(lId)) !== round2(m.loserScore))
        fail(ctx, `wk${week} ${lId} score ${match.scores.get(lId)} != legacy ${m.loserScore}`)
    }
  }

  if (legacyCount !== season.games.length)
    fail(ctx, `game count ${season.games.length} != legacy ${legacyCount}`)
  const orphan = [...byWeek.values()].flat().filter((c) => !c.used).length
  if (orphan) fail(ctx, `${orphan} new games matched no legacy matchup`)
}

// ── Stored team fields ────────────────────────────────────────────────────────────────

function validateTeams(ctx, legacy, season) {
  const teams = new Map(season.teams.map((t) => [t.memberId, t]))
  const totals = deriveRegularTotals(season)
  const placements = new Map((legacy.playoffResults ?? []).map((p) => [resolveId(p.userId), p]))
  const promoted = new Set((legacy.promotions ?? []).map(resolveId))
  const relegated = new Set((legacy.relegations ?? []).map(resolveId))

  if (teams.size !== legacy.standings.length)
    fail(ctx, `team count ${teams.size} != legacy standings ${legacy.standings.length}`)

  for (const s of legacy.standings) {
    const id = resolveId(s.userId)
    const t = teams.get(id)
    if (!t) {
      fail(ctx, `missing team ${id}`)
      continue
    }
    // `rank` is the final post-playoff placement → finalPlacement (not a regular-season seed).
    if (t.finalPlacement !== s.rank) fail(ctx, `${id} finalPlacement ${t.finalPlacement} != legacy rank ${s.rank}`)
    if (s.division != null && t.divisionId !== s.division)
      fail(ctx, `${id} divisionId ${t.divisionId} != ${s.division}`)

    // Stored record/points are Sleeper's aggregates — preserved verbatim (zero-diff vs legacy).
    if (t.record.wins !== s.wins || t.record.losses !== s.losses || t.record.ties !== (s.ties ?? 0))
      fail(ctx, `${id} record ${JSON.stringify(t.record)} != ${s.wins}-${s.losses}-${s.ties ?? 0}`)
    if (round2(t.points.for) !== round2(s.pointsFor) || round2(t.points.against) !== round2(s.pointsAgainst))
      fail(ctx, `${id} points ${JSON.stringify(t.points)} != ${s.pointsFor}/${s.pointsAgainst}`)

    // Cross-check that the games reproduce the record (W-L-T always agrees), and record where the
    // per-game sum differs from Sleeper's stored aggregate (informational — Sleeper is SoT).
    const d = totals.get(id) ?? { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 }
    if (d.wins !== t.record.wins || d.losses !== t.record.losses || d.ties !== t.record.ties)
      fail(ctx, `${id} games-derived record ${d.wins}-${d.losses}-${d.ties} != stored ${JSON.stringify(t.record)}`)
    if (round2(d.pf) !== round2(t.points.for))
      pointsDrift.push(`${ctx} ${id} pointsFor: games=${round2(d.pf)} stored=${t.points.for}`)
    if (round2(d.pa) !== round2(t.points.against))
      pointsDrift.push(`${ctx} ${id} pointsAgainst: games=${round2(d.pa)} stored=${t.points.against}`)

    const pr = placements.get(id)
    if (pr && t.finalPlacement !== pr.placement)
      fail(ctx, `${id} finalPlacement ${t.finalPlacement} != ${pr.placement}`)
    if (pr?.placementName && t.placementName !== pr.placementName)
      fail(ctx, `${id} placementName ${t.placementName} != ${pr.placementName}`)
    if (t.promoted !== promoted.has(id)) fail(ctx, `${id} promoted ${t.promoted} != ${promoted.has(id)}`)
    if (t.relegated !== relegated.has(id)) fail(ctx, `${id} relegated ${t.relegated} != ${relegated.has(id)}`)

    // Derived high/low (only where legacy provides them). Legacy standings high/low span
    // ALL games a team played, including playoff/consolation weeks (verified against
    // memberGameStats), not just the regular season — so compute over every game.
    if (s.highGame != null || s.lowGame != null) {
      const scores = season.games
        .flatMap((g) => g.participants.filter((p) => p.memberId === id).map((p) => p.score))
      if (scores.length) {
        const high = round2(Math.max(...scores))
        const low = round2(Math.min(...scores))
        if (s.highGame != null && high !== round2(s.highGame))
          fail(ctx, `${id} highGame ${high} != legacy ${s.highGame}`)
        if (s.lowGame != null && low !== round2(s.lowGame))
          fail(ctx, `${id} lowGame ${low} != legacy ${s.lowGame}`)
      }
    }
  }
}

// ── Drafts ────────────────────────────────────────────────────────────────────────────

function validateDraft(ctx, legacy, draftPath) {
  const dd = legacy.draftData
  const hasLegacy = dd && (dd.picks ?? []).length > 0
  let draft = null
  try {
    draft = readJson(draftPath)
  } catch {
    /* no draft file */
  }
  if (hasLegacy !== Boolean(draft)) {
    fail(ctx, `draft presence mismatch (legacy=${hasLegacy}, new=${Boolean(draft)})`)
    return
  }
  if (!draft) return

  if (draft.picks.length !== dd.picks.length)
    fail(ctx, `draft picks ${draft.picks.length} != legacy ${dd.picks.length}`)
  if (Object.keys(draft.draftOrder).length !== Object.keys(dd.draftOrder ?? {}).length)
    fail(ctx, `draftOrder size mismatch`)

  const byOverall = new Map(draft.picks.map((p) => [p.overall, p]))
  for (const lp of dd.picks) {
    const np = byOverall.get(lp.pickNumber)
    if (!np) {
      fail(ctx, `draft pick #${lp.pickNumber} missing`)
      continue
    }
    if (np.memberId !== resolveId(lp.pickedBy))
      fail(ctx, `pick #${lp.pickNumber} memberId ${np.memberId} != ${resolveId(lp.pickedBy)}`)
    if (np.player.name !== lp.playerInfo?.name)
      fail(ctx, `pick #${lp.pickNumber} player ${np.player.name} != ${lp.playerInfo?.name}`)
  }
}

// ── Drive ────────────────────────────────────────────────────────────────────────────

function run() {
  const years = readdirSync(LEGACY).filter((d) => /^\d{4}$/.test(d)).sort()
  let checked = 0
  for (const year of years) {
    for (const tier of TIERS) {
      let legacy
      try {
        legacy = readJson(join(LEGACY, year, `${tier}.json`))
      } catch {
        continue
      }
      const ctx = `${year}/${tier}`
      const season = readJson(join(OUT, year, `${tier}.json`))
      validateGames(ctx, legacy, season)
      validateTeams(ctx, legacy, season)
      validateDraft(ctx, legacy, join(OUT, year, `${tier}.draft.json`))
      checked++
    }
  }

  console.log('\n=== Co-owner merge report ===')
  for (const [from, to] of Object.entries(MERGES)) console.log(`  ${from} → ${to}`)

  console.log(`\n=== Sleeper aggregate vs per-game sum (${pointsDrift.length}) ===`)
  console.log("  Sleeper's stored season points differ from the sum of its own weekly scores in")
  console.log('  these cases. We keep Sleeper aggregates for standings display (Sleeper is SoT);')
  console.log('  game-level stats are derived from games. W-L-T always agrees. Informational only.')
  for (const d of pointsDrift) console.log('  ' + d)

  console.log(`\nValidated ${checked} tier-seasons.`)
  if (diffs.length) {
    console.error(`\n✗ ${diffs.length} DIFFS:`)
    for (const d of diffs.slice(0, 50)) console.error('  ' + d)
    if (diffs.length > 50) console.error(`  …and ${diffs.length - 50} more`)
    process.exit(1)
  }
  console.log('✓ Zero diffs — migration is lossless.')
}

run()
