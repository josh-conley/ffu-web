import type { Game, LiveSeasonData } from '@/data'
import { currentWeekMatchups, standingsThroughPreviousWeek } from './liveWeek'

const game = (week: number, aId: string, aScore: number, bId: string, bScore: number): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: aId, score: aScore },
    { memberId: bId, score: bScore },
  ],
})

// a beats b every completed week (1-4); week 5 (the "current" week) is in progress.
const data: LiveSeasonData = {
  tier: 'PREMIER',
  year: '2025',
  leagueId: 'lg1',
  currentWeek: 5,
  memberIds: ['a', 'b', 'c'],
  games: [
    game(1, 'a', 120, 'b', 100),
    game(2, 'a', 110, 'b', 90),
    game(3, 'a', 130, 'b', 95),
    game(4, 'a', 100, 'b', 105),
    game(5, 'a', 40, 'b', 35), // partial live score for the current week
  ],
}

describe('currentWeekMatchups', () => {
  it('returns only the current week\'s games', () => {
    const games = currentWeekMatchups(data)
    expect(games).toHaveLength(1)
    expect(games[0]?.week).toBe(5)
  })
})

describe('standingsThroughPreviousWeek', () => {
  it('excludes the in-progress current week entirely', () => {
    const rows = standingsThroughPreviousWeek(data)
    const a = rows.find((r) => r.totals.memberId === 'a')
    expect(a?.totals.wins).toBe(3)
    expect(a?.totals.losses).toBe(1) // week 4 loss; week 5's score never counted
  })

  it('gives an all-zero row to a member with no completed games', () => {
    const rows = standingsThroughPreviousWeek(data)
    const c = rows.find((r) => r.totals.memberId === 'c')
    expect(c?.totals).toMatchObject({ wins: 0, losses: 0, ties: 0, pointsFor: 0 })
  })

  it('ranks by winPct, then pointsFor, sharing ranks on an exact tie', () => {
    const rows = standingsThroughPreviousWeek(data)
    const a = rows.find((r) => r.totals.memberId === 'a')
    const b = rows.find((r) => r.totals.memberId === 'b')
    const c = rows.find((r) => r.totals.memberId === 'c')
    expect(a?.rank).toBe(1)
    expect(b?.rank).toBe(2)
    expect(c?.rank).toBe(3)
  })
})
