import type { Era, Tier } from '@/config/types'
import type { Game, SeasonData, SeasonTeam } from '@/data'
import { oddsSample } from './playoffOdds'
import { seasonUpr } from './upr'
import { uprOdds } from './uprOdds'

const game = (week: number, a: [string, number], b: [string, number]): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: a[0], score: a[1] },
    { memberId: b[0], score: b[1] },
  ],
})

const team = (memberId: string, finalPlacement?: number): SeasonTeam =>
  ({ memberId, record: { wins: 0, losses: 0, ties: 0 }, points: { for: 0, against: 0 }, finalPlacement }) as SeasonTeam

const season = (year: string, era: Era, games: Game[], teams: SeasonTeam[], tier: Tier = 'PREMIER'): SeasonData =>
  ({ year, tier, era, games, teams, schedule: [] }) as unknown as SeasonData

// Three weeks (UPR's minimum): a always wins big, d always loses small, b and c split.
const threeWeeks = [
  game(1, ['a', 150], ['b', 100]),
  game(1, ['c', 110], ['d', 80]),
  game(2, ['a', 150], ['c', 100]),
  game(2, ['b', 110], ['d', 80]),
  game(3, ['a', 150], ['d', 80]),
  game(3, ['c', 110], ['b', 100]),
]
const upr = seasonUpr({ games: threeWeeks })
// The row a team lands in: its 10-point floor, clamped into the open rows (180+, under 90).
const floor = (id: string) => Math.min(180, Math.max(80, Math.floor(upr.get(id)! / 10) * 10))

describe('uprOdds', () => {
  it('puts each team in its 10-point range and counts who made the playoff field', () => {
    const s = season('2023', 'sleeper', threeWeeks, [team('a', 1), team('b', 7), team('c', 6), team('d', 12)])
    const table = uprOdds([s], 3)
    const row = (id: string) => table.rows.find((r) => r.floor === floor(id))!
    expect(row('a').odds).toEqual({ made: 1, teams: 1 })
    expect(row('d').odds).toEqual({ made: 0, teams: 1 })
    expect(table.rows.reduce((n, r) => n + r.odds.teams, 0)).toBe(4)
  })

  it('always has 180+, every range down to 90–99, and under 90, best first', () => {
    const s = season('2023', 'sleeper', threeWeeks, [team('a', 1), team('b', 2), team('c', 3), team('d', 4)])
    const rows = uprOdds([s], 3).rows
    expect(rows.map((r) => r.floor)).toEqual([180, 170, 160, 150, 140, 130, 120, 110, 100, 90, 80])
    expect(rows[0]!.open).toBe('above')
    expect(rows.at(-1)!.open).toBe('below')
    expect(rows.filter((r) => r.open === undefined)).toHaveLength(9)
  })

  it('puts ratings past either end in the open rows', () => {
    const blowouts = [
      game(1, ['a', 260], ['b', 40]),
      game(2, ['a', 260], ['b', 40]),
      game(3, ['a', 260], ['b', 40]),
    ]
    const s = season('2023', 'sleeper', blowouts, [team('a', 1), team('b', 12)])
    const rows = uprOdds([s], 3).rows
    expect(rows[0]!.odds).toEqual({ made: 1, teams: 1 })
    expect(rows.at(-1)!.odds).toEqual({ made: 0, teams: 1 })
  })

  it('has no rows before UPR exists, and no history from seasons shorter than the game count', () => {
    const s = season('2019', 'espn', threeWeeks, [team('a', 1), team('b', 2), team('c', 3), team('d', 4)])
    expect(uprOdds([s], 2).rows).toEqual([])
    expect(uprOdds([s], 14).rows.every((r) => r.odds.teams === 0)).toBe(true)
  })

  it('lists the current season in its ranges, best first, without counting it', () => {
    const past = season('2023', 'sleeper', threeWeeks, [team('a', 1), team('b', 2), team('c', 3), team('d', 4)])
    const live = season('2026', 'sleeper', threeWeeks, [team('a'), team('b'), team('c'), team('d')], 'NATIONAL')
    const table = uprOdds([past, live], 3, [live])
    expect(table.currentPlayed).toBe(true)
    const top = table.rows.find((r) => r.floor === floor('a'))!
    expect(top.current).toEqual([{ memberId: 'a', tier: 'NATIONAL', upr: upr.get('a') }])
    expect(top.odds.teams).toBe(1)
    expect(uprOdds([past], 3, [season('2026', 'sleeper', threeWeeks.slice(0, 4), [team('a')])]).currentPlayed).toBe(false)
  })
})

describe('against the real history', () => {
  const files = import.meta.glob('../../public/data/20{18,19,20,21,22,23,24,25}/*.json', { eager: true, import: 'default' })
  const seasons = Object.entries(files)
    .filter(([path]) => /\/(premier|masters|national)\.json$/.test(path))
    .map(([, s]) => s as SeasonData)

  it('accounts for every team and every playoff spot in the sample', () => {
    const sample = oddsSample(seasons, false)
    const rows = uprOdds(sample, 10).rows
    expect(rows.reduce((n, r) => n + r.odds.teams, 0)).toBe(sample.reduce((n, s) => n + s.teams.length, 0))
    expect(rows.reduce((n, r) => n + r.odds.made, 0)).toBe(sample.length * 6)
  })
})
