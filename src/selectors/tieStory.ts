import type { SeasonData } from '@/data'
import type { Tier } from '@/config'
import { headToHead } from './headToHead'

// The story behind one Cup tie, for the live draw's reveal. Every fact is DERIVED from the eight
// seasons of migrated games — this is the thing a generic draw animation can't do, and the reason
// the reveal is worth watching: "they've met five times, and the last one was a playoff game".

export interface TieMeeting {
  year: string
  tier: Tier
  week: number
  isPlayoff: boolean
}

export interface TieStory {
  meetings: number
  /** Wins for the drawing side (a) and the drawn side (b). */
  aWins: number
  bWins: number
  ties: number
  /** Most recent meeting, if they have ever played. */
  last?: TieMeeting
  /** Their last meeting was a playoff game — the tie the commissioner should linger on. */
  playoffRematch: boolean
}

/**
 * Everything worth saying about `a` v `b` on the night. Teams that have never met come back with
 * `meetings: 0`, which is its own headline — across the whole field that is roughly six ties in ten.
 */
export function tieStory(seasons: SeasonData[], a: string, b: string): TieStory {
  const h2h = headToHead(seasons, a, b)
  const last = h2h.meetings.at(-1)
  return {
    meetings: h2h.wins + h2h.losses + h2h.ties,
    aWins: h2h.wins,
    bWins: h2h.losses,
    ties: h2h.ties,
    last: last && { year: last.year, tier: last.tier, week: last.week, isPlayoff: last.isPlayoff },
    playoffRematch: last?.isPlayoff === true,
  }
}
