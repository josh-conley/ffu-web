import type { Tier } from '@/config/types'
import type { Game, SeasonData, SeasonTeam } from '@/data'
import { completedUnionWeeks, latestUnionWeek, leaguePointsRace, topScoresForWeek, unionHighlight } from './aroundTheUnion'
import premier2026 from '../../public/data/2026/premier.json'
import masters2026 from '../../public/data/2026/masters.json'
import national2026 from '../../public/data/2026/national.json'

const live2026 = [premier2026, masters2026, national2026] as unknown as SeasonData[]

const game = (week: number, a: [string, number], b: [string, number], isPlayoff = false): Game => ({
  week,
  isPlayoff,
  participants: [
    { memberId: a[0], score: a[1] },
    { memberId: b[0], score: b[1] },
  ],
})

const team = (memberId: string, wins: number, losses: number, pointsFor: number): SeasonTeam => ({
  memberId,
  record: { wins, losses, ties: 0 },
  points: { for: pointsFor, against: 0 },
  promoted: false,
  relegated: false,
})

const season = (tier: Tier, games: Game[], teams: SeasonTeam[] = []): SeasonData =>
  ({ year: '2026', tier, era: 'sleeper', games, teams, schedule: [] }) as unknown as SeasonData

describe('completedUnionWeeks', () => {
  it('returns only weeks every league has played', () => {
    const seasons = [
      season('PREMIER', [game(1, ['a', 100], ['b', 90]), game(2, ['a', 100], ['b', 90])]),
      season('MASTERS', [game(1, ['c', 100], ['d', 90]), game(2, ['c', 100], ['d', 90])]),
      // National's week 2 hasn't been written yet — a half-refreshed Tuesday.
      season('NATIONAL', [game(1, ['e', 100], ['f', 90])]),
    ]
    expect(completedUnionWeeks(seasons)).toEqual([1])
    expect(latestUnionWeek(seasons)).toBe(1)
  })

  it('ignores playoff games and unplayed seasons', () => {
    const seasons = [
      season('PREMIER', [game(1, ['a', 100], ['b', 90]), game(15, ['a', 120], ['b', 80], true)]),
      season('MASTERS', [game(1, ['c', 100], ['d', 90])]),
      season('NATIONAL', []), // file exists (leagues created) but nothing played
    ]
    expect(completedUnionWeeks(seasons)).toEqual([1])
  })

  it('is empty before a ball is thrown', () => {
    expect(completedUnionWeeks([season('PREMIER', []), season('MASTERS', [])])).toEqual([])
    expect(latestUnionWeek([])).toBeUndefined()
  })
})

describe('topScoresForWeek', () => {
  const seasons = [
    season('PREMIER', [game(1, ['a', 150], ['b', 90]), game(2, ['a', 80], ['b', 200])]),
    season('MASTERS', [game(1, ['c', 140], ['d', 130]), game(2, ['c', 100], ['d', 95])]),
    season('NATIONAL', [game(1, ['e', 160], ['f', 70]), game(2, ['e', 110], ['f', 105])]),
  ]

  it('ranks the week across all three leagues, not per league', () => {
    const top = topScoresForWeek(seasons, 1)
    expect(top.map((t) => [t.memberId, t.tier, t.rank])).toEqual([
      ['e', 'NATIONAL', 1],
      ['a', 'PREMIER', 2],
      ['c', 'MASTERS', 3],
    ])
    expect(top[0]?.score).toBe(160)
  })

  it('carries the opponent each score was put up against', () => {
    const [best] = topScoresForWeek(seasons, 1)
    expect(best?.opponentId).toBe('f')
    expect(best?.opponentScore).toBe(70)
  })

  it('reads only the week asked for', () => {
    expect(topScoresForWeek(seasons, 2)[0]?.memberId).toBe('b')
    expect(topScoresForWeek(seasons, 9)).toEqual([])
  })

  it('shares a rank on an exact tie, and keeps everyone tied at the cutoff', () => {
    const tied = [
      season('PREMIER', [game(1, ['a', 150], ['b', 120])]),
      season('MASTERS', [game(1, ['c', 150], ['d', 120])]),
      season('NATIONAL', [game(1, ['e', 120], ['f', 80])]),
    ]
    const top = topScoresForWeek(tied, 1)
    // Two on 150 share first; three on 120 all make the podium rather than cutting the tie.
    expect(top.map((t) => t.rank)).toEqual([1, 1, 3, 3, 3])
    expect(top).toHaveLength(5)
  })

  it('excludes playoff games', () => {
    const withPlayoff = [season('PREMIER', [game(15, ['a', 200], ['b', 90], true), game(15, ['c', 110], ['d', 100])])]
    expect(topScoresForWeek(withPlayoff, 15).map((t) => t.memberId)).toEqual(['c', 'd'])
  })
})

describe('leaguePointsRace', () => {
  it('ranks leagues by total points and divides by team-games for the average', () => {
    const seasons = [
      season('PREMIER', [game(1, ['a', 100], ['b', 90])], [team('a', 1, 0, 300), team('b', 0, 1, 200)]),
      season('MASTERS', [game(1, ['c', 100], ['d', 90])], [team('c', 1, 0, 400), team('d', 0, 1, 260)]),
    ]
    const rows = leaguePointsRace(seasons)
    expect(rows.map((r) => [r.tier, r.totalPoints, r.rank])).toEqual([
      ['MASTERS', 660, 1],
      ['PREMIER', 500, 2],
    ])
    expect(rows[0]?.averageGame).toBe(330) // 660 over 2 team-games
  })

  it('omits a league that has not played and never divides by zero', () => {
    const rows = leaguePointsRace([season('PREMIER', [], [team('a', 0, 0, 0)]), season('MASTERS', [game(1, ['c', 100], ['d', 90])], [team('c', 1, 0, 100)])])
    expect(rows.map((r) => r.tier)).toEqual(['MASTERS'])
  })

  it('shares a rank when two leagues score identically', () => {
    const rows = leaguePointsRace([
      season('PREMIER', [game(1, ['a', 100], ['b', 90])], [team('a', 1, 0, 500)]),
      season('MASTERS', [game(1, ['c', 100], ['d', 90])], [team('c', 1, 0, 500)]),
    ])
    expect(rows.map((r) => r.rank)).toEqual([1, 1])
  })
})

describe('against the real 2026 season files', () => {
  it('reports the weeks actually on file', () => {
    const weeks = completedUnionWeeks(live2026)
    expect(weeks.length).toBeGreaterThan(0)
    // Whatever has been refreshed, it is a contiguous run from week 1.
    expect(weeks).toEqual(weeks.map((_, i) => i + 1))
  })

  it("the top scores of the latest week match that week's games", () => {
    const week = latestUnionWeek(live2026)!
    const top = topScoresForWeek(live2026, week)
    const everyScore = live2026
      .flatMap((s) => s.games.filter((g) => g.week === week && !g.isPlayoff))
      .flatMap((g) => g.participants.map((p) => p.score))
    expect(top[0]?.score).toBe(Math.max(...everyScore))
    expect(top.length).toBeGreaterThanOrEqual(3)
    expect(top.every((t) => t.memberId.startsWith('ffu-'))).toBe(true)
  })

  it('the league race totals the same Points For that Standings shows', () => {
    const rows = leaguePointsRace(live2026)
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      const source = live2026.find((s) => s.tier === row.tier)!
      expect(row.totalPoints).toBeCloseTo(
        source.teams.reduce((sum, t) => sum + t.points.for, 0),
        6,
      )
      expect(row.averageGame).toBeGreaterThan(50)
      expect(row.averageGame).toBeLessThan(250)
    }
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.totalPoints).toBeGreaterThanOrEqual(rows[i]!.totalPoints)
  })
})

describe('unionHighlight (the home page teaser)', () => {
  const seasons = [
    season('PREMIER', [game(1, ['a', 150], ['b', 90]), game(2, ['a', 111], ['b', 105])]),
    season('MASTERS', [game(1, ['c', 200], ['d', 90]), game(2, ['c', 120], ['d', 190])]),
  ]

  it('leads with the top score of the LATEST completed week', () => {
    const highlight = unionHighlight(seasons, '2026')
    expect(highlight?.week).toBe(2)
    expect(highlight?.leader.memberId).toBe('d')
    expect(highlight?.leader.score).toBe(190)
  })

  it('is null in the offseason — the latest played season is not the live one', () => {
    expect(unionHighlight(seasons, '2027')).toBeNull()
    expect(unionHighlight(seasons, undefined)).toBeNull()
  })

  it('is null before week 1, when the files exist but nothing has been played', () => {
    expect(unionHighlight([season('PREMIER', []), season('MASTERS', [])], '2026')).toBeNull()
  })
})
