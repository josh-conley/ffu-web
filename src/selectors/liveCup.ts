import type { Game, LiveSeasonData, Tournament } from '@/data'
import { resolveTournament, type ResolvedMatchup, type ResolvedRound, type SeasonsByTier } from './tournament'

// The Cup rounds being played (or just finished) in the weeks the home page's matchups show. Read
// from the LIVE season (Sleeper), not the season files: those only gain a week at Tuesday's refresh,
// so a round being played, or one that finished last night, isn't in them yet. Resolving the whole
// bracket from the live games also pairs the later rounds as soon as the one before is decided.

/** Rounds of `tournament` played in any of `weeks`, resolved from the live season. Empty when the
 *  Cup isn't this season's, hasn't been drawn, or has no round in those weeks. */
export function liveCupRounds(tournament: Tournament | undefined, live: readonly LiveSeasonData[], weeks: readonly number[]): ResolvedRound[] {
  const year = live[0]?.year
  if (!tournament || tournament.year !== year || tournament.participants.length === 0) return []
  if (!tournament.rounds.some((r) => weeks.includes(r.week))) return []
  const byTier: SeasonsByTier = Object.fromEntries(live.map((d) => [d.tier, d]))
  // A round whose field isn't known yet (the round before it still undecided) has no matchups.
  return resolveTournament(tournament, byTier).rounds.filter((r) => weeks.includes(r.week) && r.matchups.length > 0)
}

/** A Cup matchup as a Game, so it draws with the same card as a league game. A side with no score
 *  yet (its game not started) counts as 0, as Sleeper's own live matchups do. */
export function cupMatchupGame(m: ResolvedMatchup, week: number): Game {
  return {
    week,
    isPlayoff: false,
    participants: [m.a, m.b].map((side) => ({ memberId: side.ffuId, score: side.score ?? 0 })),
  }
}
