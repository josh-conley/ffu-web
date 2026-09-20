import type { Tier } from '@/config/types'
import type { Game, SeasonData } from '@/data'
import { activeStreaks, longestStreaks, weekMovers } from './weekForm'

const game = (week: number, a: [string, number], b: [string, number], isPlayoff = false): Game => ({
  week,
  isPlayoff,
  participants: [
    { memberId: a[0], score: a[1] },
    { memberId: b[0], score: b[1] },
  ],
})

const season = (tier: Tier, games: Game[]): SeasonData =>
  ({ year: '2026', tier, era: 'sleeper', games, teams: [] }) as unknown as SeasonData

describe('activeStreaks', () => {
  // hot wins every week; cold loses every week; swing loses twice then wins; even ties last.
  const premier = season('PREMIER', [
    game(1, ['hot', 120], ['cold', 90]),
    game(2, ['hot', 130], ['swing', 80]),
    game(3, ['hot', 110], ['even', 100]),
    game(1, ['swing', 70], ['even', 95]),
    game(2, ['cold', 60], ['even', 99]),
    game(3, ['cold', 61], ['swing', 105]),
  ])

  it('counts each active run back from the latest game', () => {
    const streaks = activeStreaks([premier], 3)
    expect(streaks.find((s) => s.memberId === 'hot')).toMatchObject({ kind: 'W', length: 3, fromWeek: 1, gamesPlayed: 3 })
    expect(streaks.find((s) => s.memberId === 'cold')).toMatchObject({ kind: 'L', length: 3, fromWeek: 1 })
    // swing lost weeks 1-2 then won week 3: a one-game run is not a streak.
    expect(streaks.find((s) => s.memberId === 'swing')).toBeUndefined()
  })

  it('reports form as of the week asked for, not the latest on file', () => {
    const streaks = activeStreaks([premier], 2)
    expect(streaks.find((s) => s.memberId === 'hot')).toMatchObject({ length: 2, gamesPlayed: 2 })
    // Through week 2, swing has lost both.
    expect(streaks.find((s) => s.memberId === 'swing')).toMatchObject({ kind: 'L', length: 2 })
  })

  it('ends a run at a tie rather than calling it a win or a loss', () => {
    const tied = season('MASTERS', [game(1, ['a', 120], ['b', 80]), game(2, ['a', 100], ['b', 100])])
    expect(activeStreaks([tied], 2)).toHaveLength(0)
  })

  it('keeps everyone level with the last qualifying run', () => {
    const streaks = activeStreaks([premier], 3)
    // Both 3-game runs are the longest of their kind.
    expect(longestStreaks(streaks, 'W', 1).map((s) => s.memberId)).toEqual(['hot'])
    expect(longestStreaks(streaks, 'L', 1).map((s) => s.memberId)).toEqual(['cold'])
  })
})

describe('weekMovers', () => {
  // After week 1: a (1-0) leads b; c and d both 0-1. In week 2 d wins big and a loses.
  const seasons = [
    season('NATIONAL', [
      game(1, ['a', 120], ['c', 80]),
      game(1, ['b', 110], ['d', 70]),
      game(2, ['d', 150], ['a', 90]),
      game(2, ['b', 100], ['c', 95]),
    ]),
  ]

  it('reports the move each team made in its own table', () => {
    const movers = weekMovers(seasons, 2)
    const d = movers.find((m) => m.memberId === 'd')
    expect(d).toMatchObject({ from: 4, to: 2, delta: 2 })
    // Biggest climb comes first.
    expect(movers[0]!.memberId).toBe('d')
    expect(movers.at(-1)!.delta).toBeLessThan(0)
  })

  it('has nothing to compare in week 1', () => {
    expect(weekMovers(seasons, 1)).toEqual([])
  })
})
