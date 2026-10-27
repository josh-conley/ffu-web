import type { SeasonData, Tournament } from '@/data'
import type { Tier } from '@/config/types'
import { cupGames, type CupGame } from './cupHistory'

// Head-to-head record between two members across any set of seasons (Members page H2H). Includes
// all meetings (league regular season, league playoffs and the FFU Cup), one series; each meeting
// carries context so the UI can label them.

export interface H2HMeeting {
  year: string
  /** The league game's tier; for a Cup game between leagues, `memberId`'s own. */
  tier: Tier
  week: number
  isPlayoff: boolean
  round?: string
  /**
   * Set when the meeting was an FFU Cup game. `leagueGame` is true when the pair ALSO played each
   * other in their league that week (two teams from one league can be paired in the Cup): it is one
   * game with one result, so it is one meeting, not two.
   */
  cup?: { round: string; leagueGame: boolean }
  score: number
  opponentScore: number
  result: 'W' | 'L' | 'T'
}

export interface H2HRecord {
  memberId: string
  opponentId: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  meetings: H2HMeeting[]
}

function addMeeting(record: H2HRecord, meeting: Omit<H2HMeeting, 'result'>): void {
  const { score, opponentScore } = meeting
  const result = score > opponentScore ? 'W' : score < opponentScore ? 'L' : 'T'
  if (result === 'W') record.wins += 1
  else if (result === 'L') record.losses += 1
  else record.ties += 1
  record.pointsFor += score
  record.pointsAgainst += opponentScore
  record.meetings.push({ ...meeting, result })
}

function addCupGame(record: H2HRecord, game: CupGame): void {
  const me = [game.a, game.b].find((s) => s.ffuId === record.memberId)
  const opp = [game.a, game.b].find((s) => s.ffuId === record.opponentId)
  if (me === undefined || opp === undefined) return
  const league = record.meetings.find((m) => m.year === game.year && m.week === game.week)
  if (league) {
    league.cup = { round: game.round, leagueGame: true }
    return
  }
  const { year, week } = game
  addMeeting(record, { year, tier: me.tier, week, isPlayoff: false, cup: { round: game.round, leagueGame: false }, score: me.score, opponentScore: opp.score })
}

/**
 * `headToHead` over Cup games already resolved (see cupGames), for a caller pairing one member with
 * many opponents, which would otherwise resolve every Cup once per opponent.
 */
export function pairRecord(seasons: SeasonData[], cups: readonly CupGame[], memberId: string, opponentId: string): H2HRecord {
  const record: H2HRecord = { memberId, opponentId, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, meetings: [] }

  for (const season of seasons) {
    for (const game of season.games) {
      const me = game.participants.find((p) => p.memberId === memberId)
      const opp = game.participants.find((p) => p.memberId === opponentId)
      if (me === undefined || opp === undefined) continue
      const { year, tier } = season
      addMeeting(record, { year, tier, week: game.week, isPlayoff: game.isPlayoff, round: game.round, score: me.score, opponentScore: opp.score })
    }
  }
  for (const game of cups) addCupGame(record, game)

  return record
}

/**
 * Every meeting between two members, league and Cup. `tournaments` is required, not defaulted, for
 * the same reason as careerWinnings': a caller that forgot it would quietly drop every Cup game.
 */
export function headToHead(seasons: SeasonData[], tournaments: readonly Tournament[], memberId: string, opponentId: string): H2HRecord {
  return pairRecord(seasons, cupGames(seasons, tournaments), memberId, opponentId)
}

/** Who leads an all-time series, phrased leader-first for a one-line tag ("STA leads 5–4"). */
export interface SeriesStanding {
  meetings: number
  /** Undefined when the series is level (including never having met). */
  leaderId?: string
  leaderWins: number
  trailerWins: number
  ties: number
}

export function seriesStanding(record: H2HRecord): SeriesStanding {
  const { wins, losses, ties } = record
  const meetings = wins + losses + ties
  if (wins === losses) return { meetings, leaderWins: wins, trailerWins: losses, ties }
  const memberLeads = wins > losses
  return {
    meetings,
    leaderId: memberLeads ? record.memberId : record.opponentId,
    leaderWins: Math.max(wins, losses),
    trailerWins: Math.min(wins, losses),
    ties,
  }
}

/** The pair's most recent meeting on file (latest year, then week), or undefined if they never met. */
export function lastMeeting(record: H2HRecord): H2HMeeting | undefined {
  return record.meetings.reduce<H2HMeeting | undefined>(
    (latest, m) => (latest === undefined || m.year > latest.year || (m.year === latest.year && m.week > latest.week) ? m : latest),
    undefined,
  )
}

/** A matchup card's series line: who leads and when they last met. */
export interface SeriesPreview {
  standing: SeriesStanding
  lastMet: H2HMeeting
}

/**
 * The all-time series ahead of a game, or null for a first meeting — a card says nothing rather
 * than "0–0", which reads as a result. The meeting is from `memberId`'s side.
 */
export function seriesPreview(record: H2HRecord): SeriesPreview | null {
  const lastMet = lastMeeting(record)
  return lastMet ? { standing: seriesStanding(record), lastMet } : null
}
