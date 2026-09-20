import type { Tier } from '@/config/types'
import type { Game, SeasonData, SeasonTeam } from '@/data'
import { UPR_MIN_WEEKS } from './upr'
import { rankedByUpr, unionStandings } from './unionStandings'
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
  // Two leagues, two teams each, played out far enough to earn a UPR (see UPR_MIN_WEEKS).
  // National's winner outscores everyone; Premier's loses every week.
  const weeks = (a: string, b: string, aScore: number, bScore: number): Game[] =>
    Array.from({ length: UPR_MIN_WEEKS }, (_, i) => game(i + 1, [a, aScore + i], [b, bScore - i]))

  const premier = season(
    'PREMIER',
    weeks('p-win', 'p-lose', 120, 80),
    [team('p-win', 4, 0, 486), team('p-lose', 0, 4, 314)],
  )
  const national = season(
    'NATIONAL',
    weeks('n-win', 'n-lose', 160, 90),
    [team('n-win', 4, 0, 646), team('n-lose', 0, 4, 354)],
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
      [
        game(1, ['m-a', 120], ['m-b', 80]),
        game(2, ['m-b', 120], ['m-a', 80]),
        game(3, ['m-a', 120], ['m-b', 80]),
        game(4, ['m-b', 120], ['m-a', 80]),
      ],
      [team('m-a', 2, 2, 400), team('m-b', 2, 2, 400)],
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

describe('unionStandings before the season has earned a UPR', () => {
  // One week in: every rating is withheld, so the table falls back to league placement.
  const young = (tier: Tier, ids: [string, number][]): SeasonData =>
    season(
      tier,
      [game(1, [ids[0]![0], ids[0]![1]], [ids[1]![0], ids[1]![1]])],
      [team(ids[0]![0], 1, 0, ids[0]![1]), team(ids[1]![0], 0, 1, ids[1]![1])],
    )

  const seasons = [
    young('PREMIER', [['p1', 100], ['p2', 60]]),
    young('MASTERS', [['m1', 140], ['m2', 70]]),
    young('NATIONAL', [['n1', 120], ['n2', 65]]),
  ]

  it('withholds the rating', () => {
    const rows = unionStandings(seasons)
    expect(rows.every((r) => r.upr === 0)).toBe(true)
    expect(rankedByUpr(rows)).toBe(false)
  })

  it('ranks on league placement, with points for as the tiebreak', () => {
    const rows = unionStandings(seasons)
    // Each league's leader first (most points among them leading), then each league's second.
    expect(rows.map((r) => r.team.memberId)).toEqual(['m1', 'n1', 'p1', 'm2', 'n2', 'p2'])
    expect(rows.map((r) => r.leagueRank)).toEqual([1, 1, 1, 2, 2, 2])
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6])
  })
})
