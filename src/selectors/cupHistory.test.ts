import type { Tier } from '@/config/types'
import type { Game, SeasonData, Tournament } from '@/data'
import { cupCareers, cupFinish, cupGames, cupRunRank, cupRuns, cupTitles } from './cupHistory'
import { seriesBreakdown } from './compare'
import { headToHead } from './headToHead'
import { rivals } from './rivals'
import tournament2026 from '../../public/data/2026/tournament.json'
import premier2026 from '../../public/data/2026/premier.json'
import masters2026 from '../../public/data/2026/masters.json'
import national2026 from '../../public/data/2026/national.json'

const game = (week: number, a: [string, number], b: [string, number]): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: a[0], score: a[1] },
    { memberId: b[0], score: b[1] },
  ],
})

const season = (tier: Tier, games: Game[]): SeasonData => ({ schemaVersion: 1, tier, year: '2026', era: 'sleeper', platformLeagueId: 'x', teams: [], games })

// Six teams from three leagues. Opening round (week 6): a beats b, d beats c, e beats f, and e — the
// lowest-scoring winner — is dropped before the final (week 7), which a wins over d. e and f are both
// Masters and ALSO played each other in their league that week, so that Cup game is a league game too.
const seasons = [
  season('PREMIER', [game(6, ['a', 100], ['p1', 0]), game(6, ['c', 80], ['p2', 0]), game(7, ['a', 110], ['p1', 0])]),
  season('NATIONAL', [game(6, ['b', 90], ['n1', 0]), game(6, ['d', 120], ['n2', 0]), game(7, ['d', 105], ['n2', 0])]),
  season('MASTERS', [game(6, ['e', 95], ['f', 70])]),
]

const cup: Tournament = {
  schemaVersion: 1,
  name: 'Test Cup',
  year: '2026',
  fieldSize: 6,
  participants: [
    { ffuId: 'a', tier: 'PREMIER' },
    { ffuId: 'b', tier: 'NATIONAL' },
    { ffuId: 'c', tier: 'PREMIER' },
    { ffuId: 'd', tier: 'NATIONAL' },
    { ffuId: 'e', tier: 'MASTERS' },
    { ffuId: 'f', tier: 'MASTERS' },
  ],
  rounds: [
    { key: 'r6', label: 'Opening Round', week: 6, matchups: [{ a: 'a', b: 'b' }, { a: 'c', b: 'd' }, { a: 'e', b: 'f' }] },
    { key: 'final', label: 'Final', week: 7, dropLowestWinner: true },
  ],
}

const runOf = (memberId: string, s = seasons) => cupRuns(s, [cup]).find((r) => r.memberId === memberId)

describe('cupGames', () => {
  it('lists every Cup game with both scores in', () => {
    const games = cupGames(seasons, [cup])
    expect(games.map((g) => [g.round, g.a.ffuId, g.b.ffuId])).toEqual([
      ['Opening Round', 'a', 'b'],
      ['Opening Round', 'c', 'd'],
      ['Opening Round', 'e', 'f'],
      ['Final', 'a', 'd'],
    ])
  })

  it('leaves out a game not yet played', () => {
    const throughWeek6 = seasons.map((s) => ({ ...s, games: s.games.filter((g) => g.week === 6) }))
    expect(cupGames(throughWeek6, [cup])).toHaveLength(3)
  })

  it('has nothing for a Cup not yet drawn, or one whose year is not among the seasons', () => {
    expect(cupGames(seasons, [{ ...cup, participants: [] }])).toEqual([])
    expect(cupGames(seasons, [{ ...cup, year: '2027' }])).toEqual([])
  })
})

describe('cupRuns', () => {
  it('crowns the champion and marks the runner-up', () => {
    expect(runOf('a')).toMatchObject({ wins: 2, losses: 0, champion: true, out: false, round: 'Final', tier: 'PREMIER' })
    expect(runOf('d')).toMatchObject({ wins: 1, losses: 1, runnerUp: true, out: true })
    expect(cupFinish(runOf('a')!)).toBe('Champion')
    expect(cupFinish(runOf('d')!)).toBe('Runner-up')
  })

  it('counts the dropped lowest winner as a win, and as out in the round it won', () => {
    expect(runOf('e')).toMatchObject({ wins: 1, losses: 0, out: true, round: 'Opening Round', depth: 0 })
    expect(cupFinish(runOf('e')!)).toBe('Opening Round')
  })

  it('counts a loss as out where it happened', () => {
    expect(runOf('b')).toMatchObject({ wins: 0, losses: 1, out: true, round: 'Opening Round' })
  })

  it('keeps a team that is still in it alive, in the round it has reached', () => {
    const throughWeek6 = seasons.map((s) => ({ ...s, games: s.games.filter((g) => g.week === 6) }))
    expect(runOf('a', throughWeek6)).toMatchObject({ wins: 1, out: false, champion: false, round: 'Final', depth: 1 })
  })

  it('ranks a title above a runner-up above an earlier exit', () => {
    expect(cupRunRank(runOf('a')!)).toBeGreaterThan(cupRunRank(runOf('d')!))
    expect(cupRunRank(runOf('d')!)).toBeGreaterThan(cupRunRank(runOf('e')!))
  })
})

describe('cupCareers and cupTitles', () => {
  it('collects titles, the best run and the Cup record across Cups', () => {
    const later: Tournament = { ...cup, year: '2027' }
    const seasons2027 = seasons.map((s) => ({ ...s, year: '2027' }))
    const careers = cupCareers(cupRuns([...seasons, ...seasons2027], [cup, later]))
    expect(careers.get('a')).toMatchObject({ titles: ['2026', '2027'], wins: 4, losses: 0 })
    expect(careers.get('a')?.best.year).toBe('2027') // equally deep: the latest
    expect(careers.get('b')?.runs).toHaveLength(2)
  })

  it('names the years a member won the Cup', () => {
    expect(cupTitles(seasons, [cup], 'a')).toEqual(['2026'])
    expect(cupTitles(seasons, [cup], 'd')).toEqual([])
  })
})

describe('Cup games in the head-to-head series', () => {
  it('counts a Cup game between leagues as a meeting, labeled with its round', () => {
    const h = headToHead(seasons, [cup], 'a', 'b')
    expect({ w: h.wins, l: h.losses }).toEqual({ w: 1, l: 0 })
    expect(h.meetings).toEqual([
      { year: '2026', tier: 'PREMIER', week: 6, isPlayoff: false, cup: { round: 'Opening Round', leagueGame: false }, score: 100, opponentScore: 90, result: 'W' },
    ])
  })

  it('counts a Cup game that was also their league game once, not twice', () => {
    const h = headToHead(seasons, [cup], 'e', 'f')
    expect(h.meetings).toHaveLength(1)
    expect(h.wins).toBe(1)
    expect(h.meetings[0]?.cup).toEqual({ round: 'Opening Round', leagueGame: true })
  })

  it('splits the series: a Cup-only meeting is not a regular-season one', () => {
    const ab = seriesBreakdown(headToHead(seasons, [cup], 'a', 'b'))
    expect(ab.regular).toEqual({ wins: 0, losses: 0, ties: 0 })
    expect(ab.cup).toEqual({ wins: 1, losses: 0, ties: 0 })
    const ef = seriesBreakdown(headToHead(seasons, [cup], 'e', 'f'))
    expect(ef.regular).toEqual({ wins: 1, losses: 0, ties: 0 })
    expect(ef.cup).toEqual({ wins: 1, losses: 0, ties: 0 })
  })

  it('makes a Cup opponent a rival', () => {
    const list = rivals(seasons, [cup], 'a')
    expect(list.find((r) => r.opponentId === 'd')?.record).toEqual(headToHead(seasons, [cup], 'a', 'd'))
    expect(list.map((r) => r.opponentId).sort()).toEqual(['b', 'd', 'p1'])
  })
})

describe('against the real 2026 Cup', () => {
  const live = [premier2026, masters2026, national2026] as unknown as SeasonData[]
  const runs = cupRuns(live, [tournament2026 as unknown as Tournament])

  it('gives every team in the field a run', () => {
    expect(runs).toHaveLength(36)
  })

  it('has one opening-round loser for every winner once the round is played', () => {
    const opening = runs.filter((r) => r.depth > 0 || r.out)
    if (opening.length === 0) return // not played yet
    const wins = runs.reduce((n, r) => n + r.wins, 0)
    const losses = runs.reduce((n, r) => n + r.losses, 0)
    expect(wins).toBe(losses)
  })
})
