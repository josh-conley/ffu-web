import type { SeasonData, SeasonTeam, Tournament } from '@/data'
import type { Tier } from '@/config/types'
import { careerStats, careerUpr, emptyCareer, type CareerStats } from './career'
import { hasBeenPlayed, seasonHighLow } from './games'
import { headToHead, lastMeeting, type H2HMeeting, type H2HRecord } from './headToHead'
import { careerWinnings } from './prizes'
import { commonOpponents, weeklySeries, type CommonOpponents, type WeeklySeries } from './pairRecords'
import { meetingOrder } from './rivals'
import { regularSeasonStandings } from './standings'
import { seasonUpr } from './upr'

// Everything the Compare view shows for a pair of members (the Members page's ?vs= and the matchup
// modal's Compare toggle). Built on the same selectors as the rest of the site (careerStats,
// careerUpr, careerWinnings, headToHead), so a number here can never disagree with the Stats page,
// a member's own page, or the modal's series tag.

const TIERS: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

/** One member's side of the comparison. */
export interface CompareSide {
  memberId: string
  /** Every league. All zeros for a member with no played season on file. */
  career: CareerStats
  /** The same figures within each league they have played in. */
  byTier: Partial<Record<Tier, CareerStats>>
  /** Career average UPR (the Stats page's "Avg UPR"); undefined with no season on file. */
  upr: number | undefined
  /** Career prize money, every league. */
  winnings: number
}

export interface WinLoss {
  wins: number
  losses: number
  ties: number
}

/** The head-to-head series, broken down. Every meeting is from member `a`'s side. */
export interface SeriesBreakdown {
  regular: WinLoss
  playoffs: WinLoss
  /** Average score per meeting: a's, then b's. Undefined if they have never met. */
  averages: [number, number] | undefined
  /** Each side's widest win over the other (a's meeting, b's meeting), if they have one. */
  biggestWins: [H2HMeeting | undefined, H2HMeeting | undefined]
  /** Who won the most recent meetings in a row, and how many. Undefined after a tie or never meeting. */
  streak: { memberId: string; length: number } | undefined
  last: H2HMeeting | undefined
  /** The series within each year they met, by year. */
  byYear: Record<string, WinLoss>
}

/** One member's season so far (or finished), in the league they played it in. */
export interface SeasonSide {
  memberId: string
  tier: Tier
  /** Sleeper's stored record and points for the season — as the Standings page shows them. */
  team: SeasonTeam
  /** Regular-season standing in their league. */
  rank: number
  upr: number | undefined
  /** Their best and worst single-game score that season (playoffs included, as in a career). */
  highLow: { high: number; low: number } | undefined
}

/** The most recent season, side by side: the "this season" half of the Compare view. */
export interface SeasonCompare {
  year: string
  /** Undefined for a member who didn't play that season. */
  a: SeasonSide | undefined
  b: SeasonSide | undefined
  common: CommonOpponents
  weekly: WeeklySeries
}

export interface MemberComparison {
  a: CompareSide
  b: CompareSide
  h2h: H2HRecord
  series: SeriesBreakdown
  /** Every opponent both have played, all time. */
  common: CommonOpponents
  /** Every regular-season week both have played, all time, as if against each other. */
  weekly: WeeklySeries
  /** The latest season on file; undefined only before any season has been played. */
  season: SeasonCompare | undefined
  /** Every played season's year, oldest first: the columns of the season-by-season strip. */
  years: string[]
}

function tally(meetings: H2HMeeting[]): WinLoss {
  return {
    wins: meetings.filter((m) => m.result === 'W').length,
    losses: meetings.filter((m) => m.result === 'L').length,
    ties: meetings.filter((m) => m.result === 'T').length,
  }
}

/** The meeting won by the widest margin for the side whose result is `result`. */
function widest(meetings: H2HMeeting[], result: 'W' | 'L'): H2HMeeting | undefined {
  const margin = (m: H2HMeeting) => Math.abs(m.score - m.opponentScore)
  return meetings.filter((m) => m.result === result).reduce<H2HMeeting | undefined>((best, m) => (best === undefined || margin(m) > margin(best) ? m : best), undefined)
}

function streakOf(record: H2HRecord): SeriesBreakdown['streak'] {
  const newestFirst = [...record.meetings].sort((x, y) => meetingOrder(y) - meetingOrder(x))
  const latest = newestFirst[0]?.result
  if (latest === undefined || latest === 'T') return undefined
  const firstBreak = newestFirst.findIndex((m) => m.result !== latest)
  return { memberId: latest === 'W' ? record.memberId : record.opponentId, length: firstBreak === -1 ? newestFirst.length : firstBreak }
}

export function seriesBreakdown(record: H2HRecord): SeriesBreakdown {
  const { meetings } = record
  const n = meetings.length
  return {
    regular: tally(meetings.filter((m) => !m.isPlayoff)),
    playoffs: tally(meetings.filter((m) => m.isPlayoff)),
    averages: n === 0 ? undefined : [record.pointsFor / n, record.pointsAgainst / n],
    biggestWins: [widest(meetings, 'W'), widest(meetings, 'L')],
    streak: streakOf(record),
    last: lastMeeting(record),
    byYear: Object.fromEntries([...new Set(meetings.map((m) => m.year))].map((y) => [y, tally(meetings.filter((m) => m.year === y))])),
  }
}

/** Career figures per member within each league, computed once for both sides. */
function careersByTier(played: SeasonData[]): Record<Tier, Map<string, CareerStats>> {
  const out = {} as Record<Tier, Map<string, CareerStats>>
  for (const tier of TIERS) out[tier] = careerStats(played.filter((s) => s.tier === tier))
  return out
}

/** A member's season in whichever of `seasons` they played, or undefined if none. */
export function seasonSide(seasons: SeasonData[], memberId: string): SeasonSide | undefined {
  for (const season of seasons) {
    const row = regularSeasonStandings(season).find((r) => r.team.memberId === memberId)
    if (!row) continue
    return { memberId, tier: season.tier, team: row.team, rank: row.rank, upr: seasonUpr(season).get(memberId), highLow: seasonHighLow(season).get(memberId) }
  }
  return undefined
}

function seasonCompare(played: SeasonData[], year: string | undefined, aId: string, bId: string): SeasonCompare | undefined {
  if (year === undefined) return undefined
  const ofYear = played.filter((s) => s.year === year)
  return {
    year,
    a: seasonSide(ofYear, aId),
    b: seasonSide(ofYear, bId),
    common: commonOpponents(ofYear, aId, bId),
    weekly: weeklySeries(ofYear, aId, bId),
  }
}

/** Always pass the FULL season set (and every Cup): the comparison is of whole careers. */
export function memberComparison(seasons: SeasonData[], tournaments: Tournament[], aId: string, bId: string): MemberComparison {
  const careers = careerStats(seasons)
  const tiers = careersByTier(seasons.filter(hasBeenPlayed))
  const upr = careerUpr(seasons)
  const winnings = careerWinnings(seasons, tournaments)
  const side = (memberId: string): CompareSide => {
    const byTier: CompareSide['byTier'] = {}
    for (const tier of TIERS) {
      const c = tiers[tier].get(memberId)
      if (c) byTier[tier] = c
    }
    return { memberId, career: careers.get(memberId) ?? emptyCareer(memberId), byTier, upr: upr.get(memberId), winnings: winnings.get(memberId)?.total ?? 0 }
  }
  const h2h = headToHead(seasons, aId, bId)
  const played = seasons.filter(hasBeenPlayed)
  const years = [...new Set(played.map((s) => s.year))].sort()
  return {
    a: side(aId),
    b: side(bId),
    h2h,
    series: seriesBreakdown(h2h),
    common: commonOpponents(seasons, aId, bId),
    weekly: weeklySeries(seasons, aId, bId),
    season: seasonCompare(played, years.at(-1), aId, bId),
    years,
  }
}

/** Points per game over a career (or a league's share of one); undefined before a game is played. */
export function pointsPerGame(c: CareerStats): number | undefined {
  const games = c.wins + c.losses + c.ties
  return games === 0 ? undefined : c.pointsFor / games
}
