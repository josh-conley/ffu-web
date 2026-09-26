import type { SeasonData } from '@/data'
import { headToHead } from './headToHead'
import { rivals } from './rivals'

const mk = (year: string, games: SeasonData['games']): SeasonData => ({
  schemaVersion: 1, tier: 'PREMIER', year, era: 'sleeper', platformLeagueId: 'x', teams: [], games,
})
const g = (week: number, a: string, as: number, b: string, bs: number, isPlayoff = false) => ({
  week, isPlayoff, participants: [{ memberId: a, score: as }, { memberId: b, score: bs }],
})

const seasons = [
  mk('2023', [g(1, 'a', 120, 'b', 100), g(2, 'a', 90, 'c', 95), g(3, 'b', 80, 'c', 70), g(4, 'd', 70, 'a', 60)]),
  mk('2024', [g(16, 'b', 110, 'a', 130, true), g(3, 'a', 88, 'c', 99)]),
]

describe('rivals', () => {
  it('lists every opponent the member has met, and only those', () => {
    expect(rivals(seasons, 'a').map((r) => r.opponentId).sort()).toEqual(['b', 'c', 'd'])
    expect(rivals(seasons, 'd').map((r) => r.opponentId)).toEqual(['a'])
  })

  it('carries the same record the headToHead selector gives the pair', () => {
    const b = rivals(seasons, 'a').find((r) => r.opponentId === 'b')
    expect(b?.record).toEqual(headToHead(seasons, 'a', 'b'))
    expect(b?.games).toBe(2)
  })

  it('orders by meetings, then by the most recent meeting', () => {
    // b and c both met a twice; b's last meeting (2024 wk 16) is later than c's (2024 wk 3).
    expect(rivals(seasons, 'a').map((r) => r.opponentId)).toEqual(['b', 'c', 'd'])
  })

  it('reports the last meeting from the member’s side', () => {
    const c = rivals(seasons, 'a').find((r) => r.opponentId === 'c')
    expect(c?.lastMet).toMatchObject({ year: '2024', week: 3, result: 'L', score: 88, opponentScore: 99 })
  })

  it('is empty for a member with no games', () => {
    expect(rivals(seasons, 'zz')).toEqual([])
  })
})
