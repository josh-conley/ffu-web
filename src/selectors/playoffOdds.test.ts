import type { Era, Tier } from '@/config/types'
import type { Game, SeasonData, SeasonTeam } from '@/data'
import { isFinishedSeason, isSmallSample, longestSeason, oddsFormats, oddsPct, oddsSample, oddsSeasonView, recordOdds } from './playoffOdds'

const game = (week: number, winner: string, loser: string, tie = false): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: winner, score: 100 },
    { memberId: loser, score: tie ? 100 : 90 },
  ],
})

const team = (memberId: string, finalPlacement?: number): SeasonTeam =>
  ({ memberId, record: { wins: 0, losses: 0, ties: 0 }, points: { for: 0, against: 0 }, finalPlacement }) as SeasonTeam

const season = (year: string, era: Era, games: Game[], teams: SeasonTeam[], tier: Tier = 'PREMIER'): SeasonData =>
  ({ year, tier, era, games, teams, schedule: [] }) as unknown as SeasonData

// Week 1: a beat b, c beat d. Week 2: a beat c, b beat d. After 2: a 2-0, b 1-1, c 1-1, d 0-2.
const twoWeeks = [game(1, 'a', 'b'), game(1, 'c', 'd'), game(2, 'a', 'c'), game(2, 'b', 'd')]
const abcd = (a: number, b: number, c: number, d: number) => [team('a', a), team('b', b), team('c', c), team('d', d)]

describe('recordOdds', () => {
  it('counts the teams at each record that finished inside the playoff field', () => {
    const table = recordOdds([season('2023', 'sleeper', twoWeeks, abcd(1, 7, 6, 12))], 2)
    expect(table.rows.map((r) => [`${r.record.wins}-${r.record.losses}`, r.now])).toEqual([
      ['2-0', { made: 1, teams: 1 }],
      ['1-1', { made: 1, teams: 2 }],
      ['0-2', { made: 0, teams: 1 }],
    ])
  })

  it('gives each record the odds a win and a loss would leave it with', () => {
    const table = recordOdds([season('2023', 'sleeper', twoWeeks, abcd(1, 7, 6, 12))], 1)
    // After 1: a and c 1-0, b and d 0-1. A win from 1-0 is 2-0 (a, made); a loss is 1-1 (b, c: one made).
    const [up, down] = table.rows
    expect(up!.now).toEqual({ made: 2, teams: 2 })
    expect(up!.afterWin).toEqual({ made: 1, teams: 1 })
    expect(up!.afterLoss).toEqual({ made: 1, teams: 2 })
    expect(down!.afterLoss).toEqual({ made: 0, teams: 1 })
  })

  it('has no win or loss odds once no season in the sample goes another game', () => {
    const s = season('2023', 'sleeper', twoWeeks, abcd(1, 2, 3, 4))
    expect(recordOdds([s], 13).rows[0]!.afterWin).toBeDefined()
    expect(recordOdds([s], 14).rows[0]!.afterWin).toBeUndefined()
  })

  it('lists every win-loss split, even ones history never had', () => {
    const table = recordOdds([season('2023', 'sleeper', twoWeeks, abcd(1, 2, 3, 4))], 3)
    expect(table.rows.map((r) => `${r.record.wins}-${r.record.losses}`)).toEqual(['3-0', '2-1', '1-2', '0-3'])
    expect(table.rows.every((r) => r.now.teams === 0)).toBe(true)
  })

  it('moves tied records out of the rows into their own list', () => {
    const games = [game(1, 'a', 'b', true), game(1, 'c', 'd'), game(2, 'a', 'c'), game(2, 'b', 'd')]
    const table = recordOdds([season('2023', 'sleeper', games, abcd(1, 9, 3, 4))], 2)
    expect(table.rows.map((r) => r.record.ties)).toEqual([0, 0, 0])
    // a and b both finish 1-0-1; one of the two made it.
    expect(table.ties).toEqual([{ record: { wins: 1, losses: 0, ties: 1 }, odds: { made: 1, teams: 2 }, current: [] }])
  })

  it('lists the current season against its records, top league first, without counting it', () => {
    const past = season('2023', 'sleeper', twoWeeks, abcd(1, 2, 3, 4))
    const national = season('2026', 'sleeper', [game(1, 'n1', 'n2')], [team('n1'), team('n2')], 'NATIONAL')
    const premier = season('2026', 'sleeper', [game(1, 'p1', 'p2')], [team('p1'), team('p2')])
    const table = recordOdds([past, national, premier], 1, [national, premier])
    expect(table.currentPlayed).toBe(true)
    expect(table.rows[0]!.current).toEqual([
      { memberId: 'p1', tier: 'PREMIER' },
      { memberId: 'n1', tier: 'NATIONAL' },
    ])
    expect(table.rows[0]!.now.teams).toBe(2)
    expect(recordOdds([past], 2, [national, premier]).currentPlayed).toBe(false)
  })
})

describe('oddsFormats / oddsSample', () => {
  const espn = season('2019', 'espn', twoWeeks, abcd(1, 2, 3, 4))
  const espn2 = season('2020', 'espn', twoWeeks, abcd(1, 2, 3, 4))
  const sleeper = season('2024', 'sleeper', twoWeeks, abcd(1, 2, 3, 4))
  const live = season('2026', 'sleeper', twoWeeks, [team('a')])

  it('takes the latest finished season’s length as the primary format', () => {
    expect(oddsFormats([espn2, sleeper, espn, live])).toEqual({
      primary: { seasonLength: 14, firstYear: '2024', lastYear: '2024' },
      others: [{ seasonLength: 13, firstYear: '2019', lastYear: '2020' }],
    })
    expect(oddsFormats([])).toEqual({ primary: undefined, others: [] })
  })

  it('samples the primary format alone unless the others are asked for', () => {
    expect(oddsSample([espn, sleeper, live], false)).toEqual([sleeper])
    expect(oddsSample([espn, sleeper, live], true)).toEqual([espn, sleeper])
  })
})

describe('helpers', () => {
  it('isFinishedSeason needs final placings and games; longestSeason reads the era', () => {
    const live = season('2026', 'sleeper', twoWeeks, [team('a')])
    const done = season('2019', 'espn', twoWeeks, [team('a', 1)])
    expect(isFinishedSeason(live)).toBe(false)
    expect(isFinishedSeason(done)).toBe(true)
    expect(longestSeason([live, done])).toBe(13)
    expect(longestSeason([])).toBe(0)
  })

  it('oddsPct is undefined without history', () => {
    expect(oddsPct({ made: 3, teams: 4 })).toBe(75)
    expect(oddsPct({ made: 0, teams: 0 })).toBeUndefined()
    expect(oddsPct(undefined)).toBeUndefined()
    expect(isSmallSample({ made: 1, teams: 4 })).toBe(true)
    expect(isSmallSample({ made: 1, teams: 5 })).toBe(false)
    expect(isSmallSample({ made: 0, teams: 0 })).toBe(false)
  })
})

describe('oddsSeasonView', () => {
  it('finds the season in progress and how far it has got', () => {
    const past = season('2025', 'sleeper', twoWeeks, [team('a', 1)])
    const live = season('2026', 'sleeper', twoWeeks, [team('a'), team('b')])
    expect(oddsSeasonView([past, live])).toEqual({ year: '2026', inProgress: [live], latestWeek: 2 })
  })

  it('has no current season once the latest year is finished', () => {
    const view = oddsSeasonView([season('2025', 'sleeper', twoWeeks, [team('a', 1)])])
    expect(view.inProgress).toEqual([])
    expect(view.latestWeek).toBeUndefined()
  })
})

describe('against the real history', () => {
  const files = import.meta.glob('../../public/data/20{18,19,20,21,22,23,24,25}/*.json', { eager: true, import: 'default' })
  const seasons = Object.entries(files)
    .filter(([path]) => /\/(premier|masters|national)\.json$/.test(path))
    .map(([, s]) => s as SeasonData)

  it('accounts for every team and every playoff spot in the sample', () => {
    for (const all of [false, true]) {
      const sample = oddsSample(seasons, all)
      const table = recordOdds(sample, 10)
      const cells = [...table.rows.map((r) => r.now), ...table.ties.map((t) => t.odds)]
      expect(cells.reduce((n, c) => n + c.teams, 0)).toBe(sample.reduce((n, s) => n + s.teams.length, 0))
      expect(cells.reduce((n, c) => n + c.made, 0)).toBe(sample.length * 6)
    }
  })
})
