import type { SeasonData, SeasonTeam } from '@/data'
import type { Tier } from '@/config/types'
import { memberComparison, pointsPerGame, seriesBreakdown } from './compare'
import { headToHead } from './headToHead'

const team = (memberId: string, wins: number, losses: number, pf: number, place: number): SeasonTeam =>
  ({ memberId, record: { wins, losses, ties: 0 }, points: { for: pf, against: 0 }, finalPlacement: place }) as SeasonTeam

const mk = (tier: Tier, year: string, teams: SeasonTeam[], games: SeasonData['games']): SeasonData => ({
  schemaVersion: 1, tier, year, era: 'sleeper', platformLeagueId: 'x', teams, games,
})

const game = (week: number, a: number, b: number, isPlayoff = false) => ({
  week, isPlayoff, participants: [{ memberId: 'a', score: a }, { memberId: 'b', score: b }],
})

const seasons = [
  mk('PREMIER', '2023', [team('a', 10, 4, 1400, 1), team('b', 4, 10, 1200, 2)], [game(1, 120, 100), game(5, 90, 140), game(16, 130, 110, true)]),
  mk('MASTERS', '2024', [team('a', 6, 8, 1300, 3), team('b', 9, 5, 1350, 1)], [game(2, 100, 101), game(9, 80, 95)]),
]

describe('seriesBreakdown', () => {
  const s = seriesBreakdown(headToHead(seasons, 'a', 'b'))

  it('splits the series into regular season and playoffs', () => {
    expect(s.regular).toEqual({ wins: 1, losses: 3, ties: 0 })
    expect(s.playoffs).toEqual({ wins: 1, losses: 0, ties: 0 })
  })

  it('finds each side\'s widest win over the other', () => {
    expect(s.biggestWins[0]).toMatchObject({ year: '2023', week: 1, score: 120, opponentScore: 100 })
    expect(s.biggestWins[1]).toMatchObject({ year: '2023', week: 5, score: 90, opponentScore: 140 })
  })

  it('counts the current streak from the most recent meeting back', () => {
    expect(s.streak).toEqual({ memberId: 'b', length: 2 })
    expect(s.last).toMatchObject({ year: '2024', week: 9 })
  })

  it('tallies the series within each year', () => {
    expect(s.byYear).toEqual({ '2023': { wins: 2, losses: 1, ties: 0 }, '2024': { wins: 0, losses: 2, ties: 0 } })
  })

  it('averages each side\'s score per meeting', () => {
    expect(s.averages).toEqual([(120 + 90 + 130 + 100 + 80) / 5, (100 + 140 + 110 + 101 + 95) / 5])
  })

  it('has no streak or averages for a pair that has never met', () => {
    const none = seriesBreakdown(headToHead(seasons, 'a', 'z'))
    expect(none.streak).toBeUndefined()
    expect(none.averages).toBeUndefined()
    expect(none.biggestWins).toEqual([undefined, undefined])
  })
})

describe('memberComparison', () => {
  const c = memberComparison(seasons, [], 'a', 'b')

  it('splits each career by league', () => {
    expect(c.a.byTier.PREMIER).toMatchObject({ seasons: 1, wins: 10, championships: 1 })
    expect(c.b.byTier.MASTERS).toMatchObject({ seasons: 1, wins: 9, championships: 1 })
    expect(c.a.byTier.NATIONAL).toBeUndefined()
  })

  it('agrees with the whole-career figures', () => {
    expect(c.a.career).toMatchObject({ seasons: 2, wins: 16, losses: 12 })
    expect(c.years).toEqual(['2023', '2024'])
  })

  it('gives a member with no seasons an empty career rather than nothing', () => {
    const fresh = memberComparison(seasons, [], 'a', 'new')
    expect(fresh.b.career).toMatchObject({ memberId: 'new', seasons: 0, wins: 0 })
    expect(fresh.b.upr).toBeUndefined()
  })
})

describe('memberComparison · season', () => {
  it('compares the latest season, each member in the league they played it in', () => {
    const { season } = memberComparison(seasons, [], 'a', 'b')
    expect(season?.year).toBe('2024')
    expect(season?.a).toMatchObject({ tier: 'MASTERS', rank: 2 })
    expect(season?.b).toMatchObject({ tier: 'MASTERS', rank: 1 })
  })

  it('carries each side\'s best and worst game of that season only', () => {
    const { season } = memberComparison(seasons, [], 'a', 'b')
    expect(season?.a?.highLow).toEqual({ high: 100, low: 80 })
    expect(season?.b?.highLow).toEqual({ high: 101, low: 95 })
  })

  it('leaves out a member who sat that season out', () => {
    expect(memberComparison(seasons, [], 'a', 'new').season?.b).toBeUndefined()
  })
})

describe('pointsPerGame', () => {
  it('divides points by games played, and has no value before a game', () => {
    expect(pointsPerGame(memberComparison(seasons, [], 'a', 'b').a.career)).toBeCloseTo(2700 / 28)
    expect(pointsPerGame(memberComparison(seasons, [], 'a', 'new').b.career)).toBeUndefined()
  })
})
