import type { Game, ScheduledGame, SeasonData, SeasonTeam } from '@/data'
import { fixtureKey, machineWeeks, pickedResults, projectedClinches, projectedSeeding, togglePick } from './playoffMachine'

const team = (memberId: string, divisionId: number): SeasonTeam => ({
  memberId,
  divisionId,
  record: { wins: 0, losses: 0, ties: 0 },
  points: { for: 0, against: 0 },
  promoted: false,
  relegated: false,
})
const played = (week: number, [a, sa]: [string, number], [b, sb]: [string, number]): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: a, score: sa },
    { memberId: b, score: sb },
  ],
})
const fixture = (week: number, a: string, b: string): ScheduledGame => ({ week, memberIds: [a, b] })

// Two divisions of two; week 1 played, weeks 2 and 15 (a playoff week) still to come.
const season = {
  schemaVersion: 1,
  tier: 'PREMIER',
  year: '2026',
  era: 'sleeper',
  teams: [team('A', 1), team('B', 1), team('C', 2), team('D', 2)],
  divisions: [
    { id: 1, name: 'One' },
    { id: 2, name: 'Two' },
  ],
  games: [played(1, ['A', 120], ['B', 100]), played(1, ['C', 90], ['D', 80])],
  schedule: [fixture(1, 'A', 'B'), fixture(1, 'C', 'D'), fixture(2, 'B', 'A'), fixture(2, 'D', 'C'), fixture(15, 'A', 'C')],
} as unknown as SeasonData

describe('machineWeeks', () => {
  it('lists the regular-season weeks still to play, not played weeks or playoff weeks', () => {
    const weeks = machineWeeks(season)
    expect(weeks.map((w) => w.week)).toEqual([2])
    expect(weeks[0]!.fixtures.map((f) => f.key)).toEqual(['2:B:A', '2:D:C'])
  })
})

describe('projectedSeeding', () => {
  it('with no picks, is the seeding as it stands', () => {
    expect(projectedSeeding(season, {}).map((r) => r.memberId)).toEqual(['A', 'C', 'B', 'D'])
  })

  it('counts a pick as a win and a loss, and in head to head — but adds no points', () => {
    // B wins the rematch: A and B both 1-1, split head to head, so A's points (120 v 100) decide.
    const rows = projectedSeeding(season, { [fixtureKey(fixture(2, 'B', 'A'))]: 'B' })
    const a = rows.find((r) => r.memberId === 'A')!
    const b = rows.find((r) => r.memberId === 'B')!
    expect([a.wins, a.losses, b.wins, b.losses]).toEqual([1, 1, 1, 1])
    expect([a.pointsFor, b.pointsFor]).toEqual([120, 100])
    expect(a).toMatchObject({ divisionWinner: true, seed: 2 })
    expect(b.divisionWinner).toBe(false)
  })

  it('can flip a division', () => {
    const rows = projectedSeeding(season, { '2:D:C': 'D' })
    // C and D split; C has more points, so C still wins division 2.
    expect(rows.find((r) => r.memberId === 'C')!.divisionWinner).toBe(true)
  })
})

describe('pickedResults', () => {
  it('ignores picks for fixtures that are no longer to play, and winners not in the fixture', () => {
    const weeks = machineWeeks(season)
    expect(pickedResults(weeks, { '1:A:B': 'B', '2:B:A': 'C', '2:D:C': 'D' })).toEqual([
      { memberIds: ['D', 'C'], winnerId: 'D' },
    ])
  })
})

describe('togglePick', () => {
  it('sets, switches and clears a pick without touching the others', () => {
    const one = togglePick({ x: 'A' }, 'k', 'B')
    expect(one).toEqual({ x: 'A', k: 'B' })
    expect(togglePick(one, 'k', 'C')).toEqual({ x: 'A', k: 'C' })
    expect(togglePick(one, 'k', 'B')).toEqual({ x: 'A' })
  })
})

describe('projectedClinches', () => {
  it('with a game left in each division, settles only what four teams in a six-team field already are', () => {
    // Everyone is in (four teams, six spots); neither division is won while its rematch is open.
    expect(Object.fromEntries(projectedClinches(season, {}))).toEqual({ A: 'playoffs', B: 'playoffs', C: 'playoffs', D: 'playoffs' })
  })

  it('reads the final seeds once the regular season is over', () => {
    const finished = {
      ...season,
      games: [...season.games, played(2, ['B', 100], ['A', 90]), played(2, ['D', 70], ['C', 95])],
      schedule: season.schedule!.filter((f) => f.week !== 15),
    } as SeasonData
    // A and B 1-1, split, A on points: A wins division 1. C 2-0 wins division 2. Four teams, all in.
    expect(Object.fromEntries(projectedClinches(finished, {}))).toEqual({ C: 'bye', A: 'bye', B: 'playoffs', D: 'playoffs' })
  })
})
