// Normalized domain types — the contract the migration emits to and the provider returns.
// One shape for ALL eras (only `era` + metadata differ). No platform IDs, no Raw/Enhanced/
// Legacy triplets, no winner/loser asymmetry — winners, margins, records, high/low, playoff
// records etc. are DERIVED in selectors, never stored (plan "store facts, derive opinions").

import type { Era, Tier } from '@/config/types'

/** Bump on any breaking change to these shapes; every emitted file carries it. */
export const SCHEMA_VERSION = 1

// ── Season results: /public/data/{year}/{tier}.json ────────────────────────────

export interface Division {
  id: number
  name: string
}

export interface TeamRecord {
  wins: number
  losses: number
  ties: number
}

export interface TeamPoints {
  for: number
  against: number
}

export interface SeasonTeam {
  memberId: string
  /** Omitted in no-division eras (all Sleeper years have divisions — backfilled — ESPN has none). */
  divisionId?: number
  /**
   * Regular-season totals as reported by the UPSTREAM provider (Sleeper roster
   * `settings.wins`/`fpts`/`fpts_against`). Stored as FACTS, not derived — Sleeper is the source
   * of truth and the live weekly fetch (from Sept) hands us these aggregates directly, so we
   * mirror them to stay consistent with what owners see on Sleeper. NOTE: Sleeper's season
   * aggregate can differ slightly from the sum of its own weekly matchup scores (45 historical
   * cases, ≤±4 pts; W-L-T always agrees). We use these stored totals for season DISPLAY, and
   * derive game-level stats (UPR inputs, records, H2H, margins, running records) from `games`.
   * The Charter "don't store derived data" rule targets OUR computations, not ingested facts.
   */
  record: TeamRecord
  points: TeamPoints
  /**
   * Final standing after playoffs — the authoritative recorded outcome. In legacy this is
   * `standings[].rank` (verified identical to `playoffResults[].placement` in all data).
   * Absent only for an unfinished, active season.
   *
   * NOTE: the regular-season playoff *seed* is deliberately NOT stored. It's a derived,
   * active-season concern (division-leader seeding + H2H tiebreakers) that only matters while
   * a live season's playoffs are being set; completed seasons care only about finalPlacement.
   * When active-season support returns (deferred), a selector derives the seed on demand.
   */
  finalPlacement?: number
  /** Optional display label for `finalPlacement` (e.g. "1st"); else derived. */
  placementName?: string
  promoted: boolean
  relegated: boolean
}

/** Which playoff tree a game belongs to. Derived from the legacy `placementType` label. */
export type Bracket = 'championship' | 'consolation' | 'placement'

export interface GameParticipant {
  memberId: string
  score: number
}

export interface Game {
  week: number
  isPlayoff: boolean
  /** Exact legacy `placementType` label, preserved verbatim (e.g. "Toilet Bowl Semifinal"). */
  round?: string
  bracket?: Bracket
  /** Exactly two participants; winner/margin/running-records are derived, never stored. */
  participants: GameParticipant[]
}

// ── Lineups: sibling file /public/data/{year}/{tier}.lineups.json (Sleeper era only) ──
// Stored SEPARATELY from season results (not embedded in Game) so Standings/Matchups don't pay the
// size — the lineup modal lazy-loads this file on demand. The same shape will serve live current-
// week data later, so the lineup UI is source-agnostic (static file now, live feed in-season later).

export interface LineupPlayer {
  /** Sleeper player id (team-defense entries are the team abbr, e.g. "BUF"). Resolve name via PlayerMap. */
  playerId: string
  points: number
  /** NFL team that week, season-accurate (from NFLverse weekly rosters); omitted if unresolved. */
  team?: string
}

export interface TeamLineup {
  memberId: string
  /** Starting lineup, in Sleeper roster-slot order. */
  starters: LineupPlayer[]
  /** Rostered but not started (didn't count). */
  bench: LineupPlayer[]
}

export interface WeekLineups {
  week: number
  /** Every team's lineup that week (a game's lineups = the two teams matching its participants). */
  teams: TeamLineup[]
}

export interface SeasonLineups {
  schemaVersion: number
  tier: Tier
  year: string
  /** Starting roster slots in order (e.g. QB, RB, RB, WR, WR, TE, FLEX, FLEX, DEF) — bench excluded.
   *  Each team's `starters[i]` fills `slots[i]`, so the modal aligns both teams row-by-row. */
  slots: string[]
  weeks: WeekLineups[]
}

// ── Player reference: /public/data/players.json (trimmed to players who appear in any lineup) ──
export interface PlayerRef {
  name: string
  position: string
  team?: string
}
export type PlayerMap = Record<string, PlayerRef>

export interface SeasonData {
  schemaVersion: number
  tier: Tier
  year: string
  era: Era
  platformLeagueId: string
  /** Present only when the season has divisions. */
  divisions?: Division[]
  teams: SeasonTeam[]
  games: Game[]
}

// ── Draft: sibling file /public/data/{year}/{tier}.draft.json ───────────────────

export type DraftType = 'snake' | 'auction' | 'linear' | 'unknown'

export interface DraftPlayer {
  id: string
  name: string
  position: string
  nflTeam?: string
  /** NFL team as of the draft year (player→historical-team map); may differ from current. */
  historicalTeam?: string
  college?: string
  age?: number
}

export interface DraftPick {
  overall: number
  round: number
  slot: number
  memberId: string
  player: DraftPlayer
}

export interface DraftData {
  schemaVersion: number
  tier: Tier
  year: string
  draftId: string
  type: DraftType
  rounds: number
  draftOrder: Record<string, number> // memberId -> slot
  picks: DraftPick[]
}

// ── Manifest: /public/data/seasons.json ─────────────────────────────────────────

export interface SeasonSummary {
  tier: Tier
  year: string
  era: Era
  hasDivisions: boolean
  hasDraft: boolean
  hasLineups: boolean
}

export interface SeasonManifest {
  schemaVersion: number
  seasons: SeasonSummary[]
}
