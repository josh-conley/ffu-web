import type { Era, Tier } from '@/config/types'
import type { Game, SeasonData, SeasonTeam } from '@/data'
import { isFinishedSeason, longestSeason, oddsSeasonView, playoffOddsByRecord } from './playoffOdds'

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

describe('playoffOddsByRecord', () => {
  it('counts the teams at each record that finished inside the playoff field', () => {
    const s = season('2023', 'sleeper', twoWeeks, [team('a', 1), team('b', 7), team('c', 6), team('d', 12)])
    const table = playoffOddsByRecord([s], 2)
    expect(table.rows.map((r) => [r.record.wins, r.record.losses, r.all])).toEqual([
      [2, 0, { made: 1, teams: 1 }],
      [1, 1, { made: 1, teams: 2 }],
      [0, 2, { made: 0, teams: 1 }],
    ])
  })

  it('lists every win-loss split, even ones history never had', () => {
    const s = season('2023', 'sleeper', twoWeeks, [team('a', 1), team('b', 2), team('c', 3), team('d', 4)])
    const table = playoffOddsByRecord([s], 1)
    expect(table.rows.map((r) => `${r.record.wins}-${r.record.losses}`)).toEqual(['1-0', '0-1'])
    expect(playoffOddsByRecord([s], 3).rows.every((r) => r.all.teams === 0)).toBe(true)
  })

  it('places a tied record by win share', () => {
    const games = [game(1, 'a', 'b', true), game(1, 'c', 'd'), game(2, 'a', 'c'), game(2, 'b', 'd')]
    const s = season('2023', 'sleeper', games, [team('a', 1), team('b', 2), team('c', 3), team('d', 4)])
    const labels = playoffOddsByRecord([s], 2).rows.map((r) => `${r.record.wins}-${r.record.losses}-${r.record.ties}`)
    // a and b both finish 1-0-1, which sits between 2-0 and 1-1.
    expect(labels).toEqual(['2-0-0', '1-0-1', '1-1-0', '0-2-0'])
  })

  it('splits seasons by length and drops a length too short to reach the game count', () => {
    const espn = season('2019', 'espn', twoWeeks, [team('a', 9), team('b', 1), team('c', 2), team('d', 3)])
    const sleeper = season('2024', 'sleeper', twoWeeks, [team('a', 1), team('b', 9), team('c', 2), team('d', 3)])
    const table = playoffOddsByRecord([sleeper, espn], 2)
    expect(table.groups).toEqual([
      { seasonLength: 14, firstYear: '2024', lastYear: '2024' },
      { seasonLength: 13, firstYear: '2019', lastYear: '2019' },
    ])
    const top = table.rows[0]!
    expect(top.all).toEqual({ made: 1, teams: 2 })
    expect(top.byGroup).toEqual([
      { made: 1, teams: 1 },
      { made: 0, teams: 1 },
    ])
    expect(playoffOddsByRecord([sleeper, espn], 14).groups.map((g) => g.seasonLength)).toEqual([14])
  })

  it('lists the current season against its records, top league first, without counting it', () => {
    const past = season('2023', 'sleeper', twoWeeks, [team('a', 1), team('b', 2), team('c', 3), team('d', 4)])
    const national = season('2026', 'sleeper', [game(1, 'n1', 'n2')], [team('n1'), team('n2')], 'NATIONAL')
    const premier = season('2026', 'sleeper', [game(1, 'p1', 'p2')], [team('p1'), team('p2')])
    const table = playoffOddsByRecord([past, national, premier], 1, [national, premier])
    expect(table.currentPlayed).toBe(true)
    expect(table.rows[0]!.current).toEqual([
      { memberId: 'p1', tier: 'PREMIER' },
      { memberId: 'n1', tier: 'NATIONAL' },
    ])
    expect(table.rows[0]!.all.teams).toBe(2)
    expect(playoffOddsByRecord([past], 2, [national, premier]).currentPlayed).toBe(false)
  })
})

describe('isFinishedSeason / longestSeason', () => {
  it('needs final placings and games', () => {
    const live = season('2026', 'sleeper', twoWeeks, [team('a')])
    const done = season('2019', 'espn', twoWeeks, [team('a', 1)])
    expect(isFinishedSeason(live)).toBe(false)
    expect(isFinishedSeason(done)).toBe(true)
    expect(longestSeason([live, done])).toBe(13)
    expect(longestSeason([])).toBe(0)
  })
})

describe('against the real history', () => {
  const files = import.meta.glob('../../public/data/20{18,19,20,21,22,23,24,25}/*.json', { eager: true, import: 'default' })
  const seasons = Object.entries(files)
    .filter(([path]) => /\/(premier|masters|national)\.json$/.test(path))
    .map(([, s]) => s as SeasonData)

  it('accounts for every team in every finished season at each game count', () => {
    const teams = seasons.reduce((n, s) => n + s.teams.length, 0)
    const total = (games: number) => playoffOddsByRecord(seasons, games).rows.reduce((n, r) => n + r.all.teams, 0)
    expect(total(10)).toBe(teams)
    // Six teams a season make it, whatever their record.
    const made = playoffOddsByRecord(seasons, 10).rows.reduce((n, r) => n + r.all.made, 0)
    expect(made).toBe(seasons.length * 6)
  })
})

describe('oddsSeasonView', () => {
  it('finds the season in progress and how far it has got', () => {
    const past = season('2025', 'sleeper', twoWeeks, [team('a', 1)])
    const live = season('2026', 'sleeper', twoWeeks, [team('a'), team('b')])
    const view = oddsSeasonView([past, live])
    expect(view).toEqual({ year: '2026', inProgress: [live], latestWeek: 2, maxGames: 14 })
  })

  it('has no current season once the latest year is finished', () => {
    const view = oddsSeasonView([season('2025', 'sleeper', twoWeeks, [team('a', 1)])])
    expect(view.inProgress).toEqual([])
    expect(view.latestWeek).toBeUndefined()
  })
})
