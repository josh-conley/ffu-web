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
  record: TeamRecord
  points: TeamPoints
  /** Authoritative final regular-season rank (selector also re-derives + verifies). */
  seed: number
  /** Standing after playoffs; absent if a team didn't reach a final placement. */
  finalPlacement?: number
  /** Optional display override; else derived from `finalPlacement`. */
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
