import type { Tier } from '@/config/types'
import type { PlayerMap, SeasonLineups, TeamLineup } from '@/data'
import { benchRegrets, playersOfWeek } from './weekPlayers'

const players: PlayerMap = {
  qb1: { name: 'Star QB', position: 'QB' },
  rb1: { name: 'Star RB', position: 'RB' },
  rb2: { name: 'Bench RB', position: 'RB' },
  wr1: { name: 'Star WR', position: 'WR' },
} as unknown as PlayerMap

const SLOTS = ['QB', 'RB', 'WR']

const team = (memberId: string, starters: [string, number][], bench: [string, number][] = []): TeamLineup => ({
  memberId,
  starters: starters.map(([playerId, points]) => ({ playerId, points })),
  bench: bench.map(([playerId, points]) => ({ playerId, points })),
})

const lineups = (tier: Tier, week: number, teams: TeamLineup[]): SeasonLineups =>
  ({ schemaVersion: 1, tier, year: '2026', slots: SLOTS, weeks: [{ week, teams }] }) as SeasonLineups

describe('playersOfWeek', () => {
  const week1 = [
    lineups('PREMIER', 1, [team('a', [['qb1', 41.5], ['rb1', 12], ['wr1', 9]], [['rb2', 99]])]),
    lineups('MASTERS', 1, [team('b', [['qb1', 30], ['rb1', 28.2], ['wr1', 4]])]),
  ]

  it('ranks the started players of the week and names who started them', () => {
    const top = playersOfWeek(week1, players, 1, 2)
    expect(top.map((p) => [p.name, p.points, p.memberId])).toEqual([
      ['Star QB', 41.5, 'a'],
      ['Star QB', 30, 'b'],
    ])
    expect(top[0]!.tier).toBe('PREMIER')
  })

  it('ignores the bench — those points never happened', () => {
    // rb2 scored 99 on a's bench and must not win player of the week.
    expect(playersOfWeek(week1, players, 1, 5).some((p) => p.name === 'Bench RB')).toBe(false)
  })

  it('reports nothing for a week with no lineups on file', () => {
    expect(playersOfWeek(week1, players, 7)).toEqual([])
  })
})

describe('benchRegrets', () => {
  it('measures what the same roster could have started', () => {
    const week = [
      // 'sleeper' started a 2-point RB with a 30-point RB on the bench: 28 left behind.
      lineups('NATIONAL', 1, [
        team('sleeper', [['qb1', 20], ['rb1', 2], ['wr1', 10]], [['rb2', 30]]),
        team('sharp', [['qb1', 20], ['rb1', 25], ['wr1', 10]], [['rb2', 1]]),
      ]),
    ]
    const [worst, ...rest] = benchRegrets(week, players, 1)
    expect(worst).toMatchObject({ memberId: 'sleeper', actual: 32, optimal: 60, lost: 28 })
    expect(worst!.worstCall).toMatchObject({ name: 'Bench RB', points: 30 })
    // A manager who started their best roster has no regret to report.
    expect(rest).toEqual([])
  })

  it('leaves out anyone who started their best lineup', () => {
    const perfect = [lineups('PREMIER', 1, [team('clean', [['qb1', 20], ['rb1', 15], ['wr1', 10]], [['rb2', 1]])])]
    expect(benchRegrets(perfect, players, 1)).toEqual([])
  })
})
