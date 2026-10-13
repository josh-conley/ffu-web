import type { SeasonData } from '@/data'
import { commonOpponents, weeklySeries } from './pairRecords'

const g = (week: number, x: [string, number], y: [string, number], isPlayoff = false) => ({
  week, isPlayoff, participants: [{ memberId: x[0], score: x[1] }, { memberId: y[0], score: y[1] }],
})
const season = (tier: SeasonData['tier'], year: string, games: SeasonData['games']): SeasonData => ({
  schemaVersion: 1, tier, year, era: 'sleeper', platformLeagueId: 'x', teams: [], games,
})

// a and b in different leagues in 2025, the same one in 2026.
const seasons = [
  season('PREMIER', '2025', [g(1, ['a', 100], ['c', 90]), g(2, ['a', 80], ['d', 95]), g(3, ['a', 70], ['e', 60])]),
  season('NATIONAL', '2025', [g(1, ['b', 120], ['c', 100]), g(2, ['b', 110], ['d', 100])]),
  season('MASTERS', '2026', [g(1, ['a', 130], ['b', 120]), g(2, ['a', 90], ['c', 91]), g(2, ['b', 140], ['d', 1]), g(15, ['a', 150], ['b', 10], true)]),
]

describe('commonOpponents', () => {
  const common = commonOpponents(seasons, 'a', 'b')

  it('keeps only opponents both have played, and never the pair themselves', () => {
    expect(common.opponents.map((o) => o.opponentId).sort()).toEqual(['c', 'd'])
  })

  it('records each side against each common opponent, and in total', () => {
    const c = common.opponents.find((o) => o.opponentId === 'c')!
    expect(c.a).toEqual({ wins: 1, losses: 1, ties: 0 })
    expect(c.b).toEqual({ wins: 1, losses: 0, ties: 0 })
    expect(common.a).toEqual({ wins: 1, losses: 2, ties: 0 })
    expect(common.b).toEqual({ wins: 3, losses: 0, ties: 0 })
  })
})

describe('weeklySeries', () => {
  const weekly = weeklySeries(seasons, 'a', 'b')

  it('sets the pair against each other every regular-season week both played, in any league', () => {
    // 2025 wk1 100–120, wk2 80–110 (wk3 b had no game); 2026 wk1 130–120, wk2 90–140. Playoffs out.
    expect(weekly.record).toEqual({ wins: 1, losses: 3, ties: 0 })
  })

  it('splits the series by year', () => {
    expect(weekly.byYear).toEqual({ '2025': { wins: 0, losses: 2, ties: 0 }, '2026': { wins: 1, losses: 1, ties: 0 } })
  })
})
