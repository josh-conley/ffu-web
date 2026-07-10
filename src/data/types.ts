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
  /** Omitted only when the season has no divisions (all Sleeper years + ESPN Premier 2018–2020 are
   *  backfilled; ESPN National 2018–2020 still has none). */
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

// ── Tournament: /public/data/{year}/tournament.json (a cross-tier knockout overlay) ──
// An FFU-administered, mid-season bracket that pairs teams ACROSS the three tiers. Teams keep
// playing their normal weekly lineups; the tournament just matches them up and eliminates by that
// week's score. So we store only FACTS here — the field of participants and the authored pairings —
// and DERIVE scores/winners/advancement in selectors from each team's home-tier data (Charter:
// "store facts, derive opinions"). Score for a round = the team's score in its tier's game that
// week; box score = that tier's lineups.json for that week.

export interface TournamentParticipant {
  ffuId: string
  /** Home tier — where this team's weekly score + lineup are sourced from. */
  tier: Tier
}

/** One pairing (two ffuIds). Winner/scores are derived, never stored. */
export interface TournamentMatchup {
  a: string
  b: string
}

export interface TournamentRound {
  /** Stable id, e.g. 'r36' | 'r18' | 'r8' | 'r4' | 'final'. */
  key: string
  label: string
  /** NFL week this round is scored on. */
  week: number
  /**
   * When true, the single lowest-scoring winner of the PREVIOUS round is eliminated before this
   * round's pairings are formed (the tournament's one bracket irregularity, e.g. 9 → 8 before the
   * Round of 8). Kept in data so the rule is declared, not hardcoded in the engine.
   */
  dropLowestWinner?: boolean
  /**
   * Authored pairings. The opening round is always authored; later rounds normally OMIT this and
   * are computed by the advancement engine (selectors/tournament). Present here only to OVERRIDE
   * the computed pairing when the commissioner sets one explicitly (e.g. a bespoke post-drop seed).
   */
  matchups?: TournamentMatchup[]
}

export interface Tournament {
  schemaVersion: number
  /** Official name is TBD — placeholder until decided. */
  name: string
  year: string
  participants: TournamentParticipant[]
  rounds: TournamentRound[]
}

// ── Live season: in-memory only, never persisted (src/data/liveSleeper.ts) ─────────────────────
// The season currently in progress, fetched client-side from Sleeper at request time. Deliberately
// NOT a `SeasonData`/`getSeason` result: that contract (+ its validator) assumes a mostly-complete
// season, which every other page/selector relies on. This is an additive, narrower shape used only
// by the home page's "current week" section.

export interface LiveSeasonData {
  tier: Tier
  year: string
  /** Carried alongside so a box-score click can fetch that game's lineups without reaching into config. */
  leagueId: string
  /** The week to show as "this week" (from Sleeper's live NFL state; may be in progress). */
  currentWeek: number
  /** Every franchise fielding a team this season (for a standings table with zero games yet). */
  memberIds: string[]
  /** Weeks 1..currentWeek. The current week's games may carry partial/live scores. */
  games: Game[]
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
