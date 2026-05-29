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
  /** Omitted in no-division eras (divisions exist only from 2025). */
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
  /**
   * Reserved seam for starter lineups + player points. Omitted for now — absence means
   * "fetch live via LineupProvider" (Sleeper era) or "unrecoverable" (ESPN era). A future
   * static backfill writes this slot with zero UI changes.
   */
  lineups?: null
}

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
