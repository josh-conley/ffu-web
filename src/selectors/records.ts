import type { GameParticipant, SeasonData } from '@/data'
import type { Tier } from '@/config/types'
import { marginOf, winnerOf } from './games'

// All-time game records across any set of seasons. Two granularities: per-team-game (for
// highest/lowest single-team scores) and per-matchup (for blowout/closest/combined). Includes
// playoff games; each record carries context (year/tier/week/round) so the UI can label/filter.

export interface GameContext {
  year: string
  tier: Tier
  week: number
  isPlayoff: boolean
  round?: string
}

export interface TeamGameRecord extends GameContext {
  memberId: string
  score: number
  opponentId: string
  opponentScore: number
  margin: number
  combined: number
}

export interface MatchupRecord extends GameContext {
  teams: GameParticipant[] // exactly two
  winnerId: string | null // null = tie
  margin: number
  combined: number
}

function contextOf(season: SeasonData, week: number, isPlayoff: boolean, round?: string): GameContext {
  return { year: season.year, tier: season.tier, week, isPlayoff, round }
}

/** One record per team per game (two per game). */
export function teamGameRecords(seasons: SeasonData[]): TeamGameRecord[] {
  const out: TeamGameRecord[] = []
  for (const season of seasons) {
    for (const game of season.games) {
      const [a, b] = game.participants
      if (a === undefined || b === undefined) continue
      const ctx = contextOf(season, game.week, game.isPlayoff, game.round)
      const margin = marginOf(game)
      const combined = a.score + b.score
      out.push({ ...ctx, memberId: a.memberId, score: a.score, opponentId: b.memberId, opponentScore: b.score, margin, combined })
      out.push({ ...ctx, memberId: b.memberId, score: b.score, opponentId: a.memberId, opponentScore: a.score, margin, combined })
    }
  }
  return out
}

/** One record per game (matchup level). */
export function matchupRecords(seasons: SeasonData[]): MatchupRecord[] {
  const out: MatchupRecord[] = []
  for (const season of seasons) {
    for (const game of season.games) {
      const [a, b] = game.participants
      if (a === undefined || b === undefined) continue
      out.push({
        ...contextOf(season, game.week, game.isPlayoff, game.round),
        teams: [a, b],
        winnerId: winnerOf(game),
        margin: marginOf(game),
        combined: a.score + b.score,
      })
    }
  }
  return out
}

export interface RecordBook {
  highestGames: TeamGameRecord[]
  lowestGames: TeamGameRecord[]
  biggestBlowouts: MatchupRecord[]
  closestGames: MatchupRecord[]
  highestCombined: MatchupRecord[]
  lowestCombined: MatchupRecord[]
}

const cap = <T>(rows: T[], limit?: number): T[] => (limit === undefined ? rows : rows.slice(0, limit))

/** The six all-time record leaderboards in one pass. `limit` caps each list (default: all). */
export function buildRecordBook(seasons: SeasonData[], limit?: number): RecordBook {
  const teamGames = teamGameRecords(seasons)
  const matchups = matchupRecords(seasons)
  return {
    highestGames: cap([...teamGames].sort((a, b) => b.score - a.score), limit),
    lowestGames: cap([...teamGames].sort((a, b) => a.score - b.score), limit),
    biggestBlowouts: cap([...matchups].sort((a, b) => b.margin - a.margin), limit),
    closestGames: cap([...matchups].sort((a, b) => a.margin - b.margin), limit),
    highestCombined: cap([...matchups].sort((a, b) => b.combined - a.combined), limit),
    lowestCombined: cap([...matchups].sort((a, b) => a.combined - b.combined), limit),
  }
}
