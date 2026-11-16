import type { Era } from './types'

// Era-derived metadata — the single reader of era rules (replaces the old era-detection.ts
// branching smeared across the codebase). Code reads a season's `era` from metadata and asks
// here; it never recomputes from the year. ESPN: 16 wks, playoffs 14–16. Sleeper: 17, 15–17.

export function seasonLength(era: Era): number {
  return era === 'espn' ? 16 : 17
}

export function playoffWeeks(era: Era): number[] {
  return era === 'espn' ? [14, 15, 16] : [15, 16, 17]
}

export function regularSeasonWeeks(era: Era): number[] {
  const firstPlayoffWeek = Math.min(...playoffWeeks(era))
  return Array.from({ length: firstPlayoffWeek - 1 }, (_, i) => i + 1)
}

/**
 * The playoff field a regular season sets, Sleeper era (all three tiers alike): six teams, the top
 * two on a first-round bye. Seeds 1 and 2 go to the two best DIVISION WINNERS; the remaining
 * division winner is guaranteed a place even when four other teams have better records. The seeding
 * itself is derived in selectors/playoffSeeding.ts.
 */
export const PLAYOFF_FIELD = { teams: 6, byes: 2, divisionWinnerSeeds: 2 } as const
