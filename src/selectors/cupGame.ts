import { LIVE_LEAGUE_IDS } from '@/config'
import type { Tier } from '@/config/types'

// Where a Cup game's box score comes from. A Cup game is two teams' ordinary league games that
// week, so its lineups are wherever each team's league game is: the season's lineup files once
// the week is on file, Sleeper while the season is being played. Before that (or for a past
// season missing its files) there is nothing to show, and the game is not clickable.

/** One team in a Cup game, as the bracket knows it. `score` is set once their week is on file. */
export interface CupGameSide {
  ffuId: string
  tier: Tier
  /** Draw seed (1–36), shown wherever the game is. */
  seed?: number
  score?: number
}

export type CupGameSource =
  | { kind: 'final'; scores: [number, number] }
  | { kind: 'live'; leagueIds: [string, string] }

/** `readLive`: the game's week isn't on file yet (see liveBracket), so even a scored game is read from Sleeper. */
export function cupGameSource(year: string, a: CupGameSide, b: CupGameSide, readLive = false): CupGameSource | undefined {
  if (!readLive && a.score !== undefined && b.score !== undefined) return { kind: 'final', scores: [a.score, b.score] }
  const live = LIVE_LEAGUE_IDS[year]
  if (live) return { kind: 'live', leagueIds: [live[a.tier], live[b.tier]] }
  return undefined
}
