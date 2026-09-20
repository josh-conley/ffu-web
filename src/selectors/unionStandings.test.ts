import type { Tier } from '@/config/types'
import type { Game, SeasonData, SeasonTeam } from '@/data'
import { unionStandings } from './unionStandings'
import premier2025 from '../../public/data/2025/premier.json'
import masters2025 from '../../public/data/2025/masters.json'
import national2025 from '../../public/data/2025/national.json'

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

const season = (tier: Tier, games: Game[], teams: SeasonTeam[]): SeasonData =>
  ({ year: '2025', tier, era: 'sleeper', games, teams }) as unknown as SeasonData

describe('unionStandings', () => {
  // Two leagues, two teams each. National's winner outscores everyone; Premier's loses every game.
  const premier = season(
    'PREMIER',
    [game(1, ['p-win', 120], ['p-lose', 80]), game(2, ['p-win', 118], ['p-lose', 82])],
    [team('p-win', 2, 0, 238), team('p-lose', 0, 2, 162)],
  )
  const national = season(
    'NATIONAL',
    [game(1, ['n-win', 160], ['n-lose', 90]), game(2, ['n-win', 155], ['n-lose', 95])],
    [team('n-win', 2, 0, 315), team('n-lose', 0, 2, 185)],
  )

  it('ranks every team across the leagues by UPR', () => {
    const rows = unionStandings([premier, national])
    expect(rows.map((r) => r.team.memberId)).toEqual(['n-win', 'p-win', 'n-lose', 'p-lose'])
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4])
    // National's best beats Premier's best here: the view ranks on the rating, not on the tier.
    expect(rows[0]!.tier).toBe('NATIONAL')
  })

  it('keeps the placement each team has in its own league', () => {
    const rows = unionStandings([premier, national])
    expect(rows.map((r) => [r.tier, r.leagueRank])).toEqual([
      ['NATIONAL', 1],
      ['PREMIER', 1],
      ['NATIONAL', 2],
      ['PREMIER', 2],
    ])
  })

  it('shares a rank between teams with equal UPR', () => {
    const twin = season(
      'MASTERS',
      [game(1, ['m-a', 120], ['m-b', 80]), game(2, ['m-b', 120], ['m-a', 80])],
      [team('m-a', 1, 1, 200), team('m-b', 1, 1, 200)],
    )
    const rows = unionStandings([twin])
    expect(rows[0]!.upr).toBe(rows[1]!.upr)
    expect(rows.map((r) => r.rank)).toEqual([1, 1])
  })

  it('covers all 36 teams of a real season, in descending UPR', () => {
    const rows = unionStandings([premier2025, masters2025, national2025] as unknown as SeasonData[])
    expect(rows).toHaveLength(36)
    expect(new Set(rows.map((r) => r.team.memberId)).size).toBe(36)
    expect(rows.map((r) => r.upr)).toEqual([...rows.map((r) => r.upr)].sort((a, b) => b - a))
    expect(rows.map((r) => r.tier)).toContain('MASTERS')
  })
})
