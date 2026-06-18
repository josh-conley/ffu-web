import type { LineupPlayer, SeasonLineups, TeamLineup } from '@/data'
import { benchByPoints, gameLineups } from './lineups'

const player = (playerId: string, points: number): LineupPlayer => ({ playerId, points })

const team = (memberId: string, starters: LineupPlayer[], bench: LineupPlayer[] = []): TeamLineup => ({
  memberId,
  starters,
  bench,
})

const lineups: SeasonLineups = {
  schemaVersion: 1,
  tier: 'PREMIER',
  year: '2024',
  slots: ['QB'],
  weeks: [
    {
      week: 1,
      teams: [team('a', [player('p1', 10)]), team('b', [player('p2', 20)]), team('c', [player('p3', 5)])],
    },
  ],
}

describe('gameLineups', () => {
  it('returns the two teams for the week, in the order of memberIds given', () => {
    const teams = gameLineups(lineups, 1, ['b', 'a'])
    expect(teams.map((t) => t.memberId)).toEqual(['b', 'a'])
  })

  it('returns an empty array when the week is missing', () => {
    expect(gameLineups(lineups, 99, ['a', 'b'])).toEqual([])
  })

  it('drops memberIds that have no lineup that week', () => {
    expect(gameLineups(lineups, 1, ['a', 'missing']).map((t) => t.memberId)).toEqual(['a'])
  })
})

describe('benchByPoints', () => {
  it('orders the bench by points, highest first', () => {
    const t = team('a', [], [player('low', 2), player('high', 18), player('mid', 9)])
    expect(benchByPoints(t).map((p) => p.playerId)).toEqual(['high', 'mid', 'low'])
  })

  it('does not mutate the original bench order', () => {
    const bench = [player('low', 2), player('high', 18)]
    const t = team('a', [], bench)
    benchByPoints(t)
    expect(bench.map((p) => p.playerId)).toEqual(['low', 'high'])
  })
})
