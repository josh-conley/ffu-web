import type { LineupPlayer, SeasonLineups, TeamLineup } from '@/data'
import { benchByPoints, gameLineups, startedPlayers, starterPoints } from './lineups'

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

describe('starterPoints', () => {
  it('totals the starters only, never the bench', () => {
    const team = { memberId: 'a', starters: [{ playerId: '1', points: 12.34 }, { playerId: '2', points: 7.2 }], bench: [{ playerId: '3', points: 99 }] }
    expect(starterPoints(team)).toBe(19.54)
  })

  it('is 0 for a week nobody has played yet', () => {
    expect(starterPoints({ memberId: 'a', starters: [{ playerId: '1', points: 0 }], bench: [] })).toBe(0)
  })

  it('rounds to cents rather than carrying float dust', () => {
    const team = { memberId: 'a', starters: [{ playerId: '1', points: 0.1 }, { playerId: '2', points: 0.2 }], bench: [] }
    expect(starterPoints(team)).toBe(0.3)
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

describe('startedPlayers', () => {
  it('drops empty slots and keeps the players', () => {
    const team: TeamLineup = { memberId: 'm', starters: [null, { playerId: 'p1', points: 4 }], bench: [] }
    expect(startedPlayers(team)).toEqual([{ playerId: 'p1', points: 4 }])
    expect(starterPoints(team)).toBe(4)
  })
})
