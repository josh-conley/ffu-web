import type { NflGameClock, PlayerProjection } from './types'
import { sleeperAppGet } from './sleeperApi'

// The NFL side of a live fantasy week: which real games have kicked off / finished, and what each
// player is projected to score. Both come from Sleeper's undocumented app API (see sleeperApi.ts),
// so the UI built on them is garnish — a failure here must never take down the box score itself.

const QUARTER_SECONDS = 15 * 60
const REGULATION_SECONDS = 4 * QUARTER_SECONDS

interface RawScore {
  status?: string
  metadata?: {
    home_team?: string
    away_team?: string
    quarter_num?: number | string
    time_remaining?: string
    is_in_progress?: boolean
    is_over?: boolean
  }
}

/** "MM:SS" left in the quarter -> seconds; anything unreadable counts as a full quarter. */
function clockSeconds(timeRemaining: string | undefined): number {
  const match = /^(\d+):(\d{2})$/.exec(timeRemaining ?? '')
  return match ? Number(match[1]) * 60 + Number(match[2]) : QUARTER_SECONDS
}

function remainingShare(quarter: number, timeRemaining: string | undefined): number {
  if (!(quarter >= 1)) return 1 // live but no quarter reported yet: treat as just kicked off
  if (quarter > 4) return 0 // overtime: regulation is spent
  const left = (4 - quarter) * QUARTER_SECONDS + clockSeconds(timeRemaining)
  return Math.min(1, Math.max(0, left / REGULATION_SECONDS))
}

/** Sleeper's game row -> our clock. `canceled` counts as over: nobody in it scores any more. */
export function gameClock(raw: RawScore): NflGameClock {
  const meta = raw.metadata ?? {}
  if (raw.status === 'complete' || raw.status === 'canceled' || meta.is_over) return { status: 'final', remaining: 0 }
  if (raw.status === 'in_game' || meta.is_in_progress) {
    return { status: 'live', remaining: remainingShare(Number(meta.quarter_num), meta.time_remaining) }
  }
  return { status: 'pre', remaining: 1 }
}

/** Every NFL game of the week, keyed by BOTH teams' abbreviations (so a player's team finds it). */
export async function fetchNflWeekGames(year: string, week: number): Promise<Record<string, NflGameClock>> {
  const rows = await sleeperAppGet<RawScore[]>(`/scores/nfl/regular/${year}/${week}`)
  if (!Array.isArray(rows)) throw new Error(`Sleeper scores ${year}/${week}: not an array`)
  const byTeam: Record<string, NflGameClock> = {}
  for (const row of rows) {
    const clock = gameClock(row)
    for (const team of [row.metadata?.home_team, row.metadata?.away_team]) if (team) byTeam[team] = clock
  }
  return byTeam
}

interface RawProjection {
  player_id?: string
  team?: string | null
  stats?: Record<string, unknown>
}

const PROJECTED_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

function numericStats(stats: Record<string, unknown> | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(stats ?? {})) if (typeof value === 'number') out[key] = value
  return out
}

// ~230KB gzipped for a whole week, and it barely moves inside a session — fetched once per week per
// session, shared by the home page's cards and every box score opened after them.
const projectionCache = new Map<string, Promise<Record<string, PlayerProjection>>>()

async function loadProjections(year: string, week: number): Promise<Record<string, PlayerProjection>> {
  const positions = PROJECTED_POSITIONS.map((p) => `position[]=${p}`).join('&')
  const rows = await sleeperAppGet<RawProjection[]>(`/projections/nfl/${year}/${week}?season_type=regular&${positions}`)
  if (!Array.isArray(rows)) throw new Error(`Sleeper projections ${year}/${week}: not an array`)
  const out: Record<string, PlayerProjection> = {}
  for (const row of rows) {
    if (!row.player_id) continue
    out[row.player_id] = row.team ? { team: row.team, stats: numericStats(row.stats) } : { stats: numericStats(row.stats) }
  }
  return out
}

/** Every player's projected stat line for the week, keyed by Sleeper player id. */
export function fetchWeekProjections(year: string, week: number): Promise<Record<string, PlayerProjection>> {
  const key = `${year}:${week}`
  let pending = projectionCache.get(key)
  if (!pending) {
    pending = loadProjections(year, week)
    // Don't cache a failure — the next open retries instead of going without all session.
    pending.catch(() => projectionCache.delete(key))
    projectionCache.set(key, pending)
  }
  return pending
}
