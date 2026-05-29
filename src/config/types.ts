// Config layer — the foundation. Identity + registry only. Platform IDs (sleeper/espn)
// live HERE and nowhere downstream (Charter §3, plan "one identity: ffuId").

/** The three league tiers, in promotion/relegation hierarchy order. */
export type Tier = 'PREMIER' | 'MASTERS' | 'NATIONAL'

/** Data era — drives season length, playoff weeks, and which tiers exist that year. */
export type Era = 'espn' | 'sleeper'

/** A real person who manages a team. Display-only; season data never references owners. */
export interface Owner {
  id: string // 'owner-014'
  firstName: string
  lastInitial: string // → future display "Josh C."
}

export type OwnerRole = 'primary' | 'secondary'

export interface MemberOwner {
  ownerId: string
  role: OwnerRole
}

/**
 * A franchise — THE identity. `ffuId` is the only id used anywhere downstream of config.
 * Single-owner teams have one entry in `owners`; a co-owned team (the "Team Dogecoin"
 * case) has a primary + secondary owner and both Sleeper accounts in `platformIds.sleeper`.
 */
export interface Member {
  ffuId: string
  name: string
  abbreviation: string
  // NOTE: no `joinedYear` / `isActive` — both are DERIVED from the season data
  // (`careerStats().firstYear` / `.isActive`), not stored. The legacy constants values were
  // unreliable (joinedYear wrong for 43/63; isActive was `true` even for long-gone historical
  // teams). The migrated data is the authority for our own notions.
  historicalNames?: Record<string, string> // year -> team name used that season
  owners: MemberOwner[]
  platformIds: { sleeper?: string[]; espn?: string[] }
}

/** Registry entry for one tier-season. */
export interface SeasonMeta {
  tier: Tier
  year: string
  era: Era
  platformLeagueId: string
  hasDivisions: boolean
  seasonLength?: number // optional override; else derived from era
  playoffWeeks?: number[] // optional override; else derived from era
}
