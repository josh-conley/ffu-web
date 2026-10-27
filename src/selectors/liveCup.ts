import type { Game, LiveSeasonData, Tournament } from '@/data'
import { resolveTournament, weekScore, type ResolvedMatchup, type ResolvedRound, type ResolvedSide, type ResolvedTournament, type SeasonsByTier } from './tournament'

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

/** A round of the week being played, with each side's score so far. No winner: the week isn't over. */
function inProgress(round: ResolvedRound, seasons: SeasonsByTier): ResolvedRound {
  const scored = (side: ResolvedSide): ResolvedSide => ({ ...side, score: weekScore(seasons, side.tier, side.ffuId, round.week) })
  return { ...round, live: true, inProgress: true, matchups: round.matchups.map((m) => ({ ...m, a: scored(m.a), b: scored(m.b) })) }
}

/**
 * The Cup bracket as it stands right now, for the Cup page. Every week Sleeper has finished decides
 * its round, so the bracket moves on as soon as the week ends rather than at Tuesday's refresh, and
 * the round being played carries its live scores with no winner until the week is over (only once a
 * point has been scored: before kickoff it's all zeroes). Rounds after `lastWeekOnFile` are marked
 * `live`, so their box scores are read from Sleeper too, since the lineup files don't have them yet.
 *
 * Undefined when the live season isn't the Cup's, a league in the field is missing from it, or the
 * Cup hasn't been drawn: the season files' bracket stands.
 */
export function liveBracket(tournament: Tournament, live: readonly LiveSeasonData[], lastWeekOnFile: number): ResolvedTournament | undefined {
  const week = live[0]?.currentWeek
  if (week === undefined || tournament.year !== live[0]?.year || tournament.participants.length === 0) return undefined
  if (tournament.participants.some((p) => !live.some((d) => d.tier === p.tier))) return undefined
  const finished: SeasonsByTier = Object.fromEntries(live.map((d) => [d.tier, { games: d.games.filter((g) => g.week < week) }]))
  const now: SeasonsByTier = Object.fromEntries(live.map((d) => [d.tier, d]))
  const started = live.some((d) => d.games.some((g) => g.week === week && g.participants.some((p) => p.score > 0)))
  const bracket = resolveTournament(tournament, finished)
  return {
    ...bracket,
    rounds: bracket.rounds.map((round) => {
      if (round.week <= lastWeekOnFile) return round
      if (round.week === week && started && round.matchups.length > 0) return inProgress(round, now)
      return { ...round, live: true }
    }),
  }
}
