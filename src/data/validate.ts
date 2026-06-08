// Boundary guards. The provider owns 100% of source→domain mapping, so it validates raw JSON
// here at the seam — nothing above ever sees an unchecked shape. The migration already proved
// the CONTENT is correct (zero-diff); these prove the SHAPE at load time and fail loudly on a
// corrupt/old file. Lightweight hand-written checks (no schema-lib dependency).

import { SCHEMA_VERSION } from './types'
import type { DraftData, PlayerMap, SeasonData, SeasonLineups, SeasonManifest } from './types'

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function check(cond: unknown, ctx: string, msg: string): asserts cond {
  if (!cond) throw new Error(`Invalid data (${ctx}): ${msg}`)
}

function assertSchema(raw: Record<string, unknown>, ctx: string): void {
  check(raw.schemaVersion === SCHEMA_VERSION, ctx, `schemaVersion ${String(raw.schemaVersion)} != ${SCHEMA_VERSION}`)
}

function assertTeam(t: unknown, ctx: string): void {
  check(isObject(t), ctx, 'team is not an object')
  check(typeof t.memberId === 'string', ctx, 'team missing memberId')
  check(isObject(t.record) && typeof t.record.wins === 'number', ctx, `team ${String(t.memberId)} bad record`)
  check(isObject(t.points) && typeof t.points.for === 'number', ctx, `team ${String(t.memberId)} bad points`)
}

function assertGame(g: unknown, ctx: string): void {
  check(isObject(g), ctx, 'game is not an object')
  check(typeof g.week === 'number', ctx, 'game missing week')
  check(typeof g.isPlayoff === 'boolean', ctx, `wk${String(g.week)} missing isPlayoff`)
  check(Array.isArray(g.participants) && g.participants.length === 2, ctx, `wk${String(g.week)} needs 2 participants`)
  for (const p of g.participants) {
    check(
      isObject(p) && typeof p.memberId === 'string' && typeof p.score === 'number',
      ctx,
      `wk${String(g.week)} bad participant`,
    )
  }
}

export function assertSeasonData(raw: unknown, ctx: string): SeasonData {
  check(isObject(raw), ctx, 'not an object')
  assertSchema(raw, ctx)
  check(typeof raw.tier === 'string', ctx, 'missing tier')
  check(typeof raw.year === 'string', ctx, 'missing year')
  check(raw.era === 'espn' || raw.era === 'sleeper', ctx, `bad era ${String(raw.era)}`)
  check(typeof raw.platformLeagueId === 'string', ctx, 'missing platformLeagueId')
  check(Array.isArray(raw.teams) && raw.teams.length > 0, ctx, 'teams not a non-empty array')
  check(Array.isArray(raw.games) && raw.games.length > 0, ctx, 'games not a non-empty array')
  for (const t of raw.teams) assertTeam(t, ctx)
  for (const g of raw.games) assertGame(g, ctx)
  return raw as unknown as SeasonData
}

export function assertDraftData(raw: unknown, ctx: string): DraftData {
  check(isObject(raw), ctx, 'not an object')
  assertSchema(raw, ctx)
  check(typeof raw.draftId === 'string', ctx, 'missing draftId')
  check(isObject(raw.draftOrder), ctx, 'missing draftOrder')
  check(Array.isArray(raw.picks) && raw.picks.length > 0, ctx, 'picks not a non-empty array')
  return raw as unknown as DraftData
}

export function assertSeasonLineups(raw: unknown, ctx: string): SeasonLineups {
  check(isObject(raw), ctx, 'not an object')
  assertSchema(raw, ctx)
  check(typeof raw.tier === 'string', ctx, 'missing tier')
  check(Array.isArray(raw.weeks), ctx, 'weeks not an array')
  return raw as unknown as SeasonLineups
}

export function assertPlayerMap(raw: unknown, ctx: string): PlayerMap {
  check(isObject(raw), ctx, 'not an object')
  return raw as PlayerMap
}

export function assertManifest(raw: unknown, ctx: string): SeasonManifest {
  check(isObject(raw), ctx, 'not an object')
  assertSchema(raw, ctx)
  check(Array.isArray(raw.seasons) && raw.seasons.length > 0, ctx, 'seasons not a non-empty array')
  return raw as unknown as SeasonManifest
}
