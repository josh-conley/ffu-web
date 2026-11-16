import type { SeasonData } from '@/data'
import { playedResults } from './playoffMachine'
import { playoffSeeding, type SeedingResult, type SeedingTeam } from './playoffSeeding'
import masters2025 from '../../public/data/2025/masters.json'
import national2025 from '../../public/data/2025/national.json'
import premier2025 from '../../public/data/2025/premier.json'

/** A result with scores: `winner` scored `w`, the other `l`. */
const game = (winner: string, loser: string, w = 100, l = 90): SeedingResult => ({
  memberIds: [winner, loser],
  winnerId: winner,
  scores: [w, l],
})
/** `n` identical results. */
const times = (n: number, result: SeedingResult): SeedingResult[] => Array.from({ length: n }, () => result)

const seedsOf = (teams: SeedingTeam[], results: SeedingResult[]) => playoffSeeding(teams, results).map((r) => r.memberId)

describe('playoffSeeding — division winners', () => {
  // Three divisions of two. Division 1: A beats B. Division 2: C beats D. Division 3: E beats F.
  const teams: SeedingTeam[] = [
    { memberId: 'A', divisionId: 1 },
    { memberId: 'B', divisionId: 1 },
    { memberId: 'C', divisionId: 2 },
    { memberId: 'D', divisionId: 2 },
    { memberId: 'E', divisionId: 3 },
    { memberId: 'F', divisionId: 3 },
  ]
  const field = { teams: 4, byes: 2, divisionWinnerSeeds: 2 }

  it('gives seeds 1 and 2 to the two best division winners, even over a better wild card', () => {
    // B (5-1) has a better record than division-2 winner C (3-1), but only lost its division to A.
    const results = [
      ...times(6, game('A', 'X')),
      ...times(5, game('B', 'X')), game('A', 'B'),
      game('C', 'D'), ...times(2, game('C', 'X')), game('X', 'C'),
      ...times(2, game('D', 'X')),
      ...times(2, game('E', 'F')), ...times(2, game('X', 'E')),
    ]
    const rows = playoffSeeding(teams, results, field)
    expect(rows.slice(0, 2).map((r) => r.memberId)).toEqual(['A', 'C'])
    expect(rows.slice(0, 2).every((r) => r.divisionWinner && r.bye)).toBe(true)
    // B and D are better than C on record, but seed behind it.
    expect(rows.find((r) => r.memberId === 'B')!.seed).toBe(3)
  })

  it('only lifts the division WINNER: a losing team in a division is not guaranteed anything', () => {
    // Division 3: F (4-1) beats out E (1-4), so F is the winner; E stays out of a 4-team field.
    const rows = playoffSeeding(
      teams,
      [
        ...times(6, game('A', 'X')),
        ...times(5, game('C', 'X')),
        ...times(4, game('B', 'X')),
        ...times(4, game('D', 'X')),
        ...times(4, game('F', 'X')),
        game('E', 'F'), ...times(4, game('X', 'E')),
      ],
      field,
    )
    expect(rows.find((r) => r.memberId === 'F')!.divisionWinner).toBe(true)
    expect(rows.find((r) => r.memberId === 'E')).toMatchObject({ divisionWinner: false, inPlayoffs: false })
  })

  it('lifts a losing-record division winner over better wild cards into the last seed', () => {
    const rows = playoffSeeding(
      teams,
      [
        ...times(6, game('A', 'X')),
        ...times(5, game('C', 'X')),
        ...times(4, game('B', 'X')),
        ...times(4, game('D', 'X')),
        ...times(2, game('E', 'F')), ...times(3, game('X', 'E')), // E 2-3 wins div 3 over F 0-2
      ],
      field,
    )
    expect(rows.map((r) => r.memberId)).toEqual(['A', 'C', 'B', 'E', 'D', 'F'])
    const e = rows.find((r) => r.memberId === 'E')!
    expect(e).toMatchObject({ seed: 4, guaranteedSpot: true, inPlayoffs: true, divisionWinner: true })
    expect(rows.find((r) => r.memberId === 'D')!.inPlayoffs).toBe(false)
  })

  it('leaves the remaining division winner where it is when it is already in the field', () => {
    const rows = playoffSeeding(
      teams,
      [...times(6, game('A', 'X')), ...times(5, game('C', 'X')), ...times(4, game('E', 'X')), ...times(2, game('B', 'X'))],
      field,
    )
    expect(rows.find((r) => r.memberId === 'E')).toMatchObject({ seed: 3, guaranteedSpot: false })
  })
})

describe('playoffSeeding — tiebreakers (no divisions)', () => {
  const teams = ['A', 'B', 'C', 'D'].map((memberId) => ({ memberId }))

  it('breaks a two-way tie head to head, ahead of points for', () => {
    // A and B both 1-1; B beat A, but A scored far more.
    const results = [game('B', 'A', 80, 70), game('A', 'X', 200, 10), game('X', 'B', 81, 80)]
    const rows = playoffSeeding(teams.slice(0, 2), results)
    expect(rows.slice(0, 2).map((r) => [r.memberId, r.tiebreak])).toEqual([['B', 'h2h'], ['A', 'h2h']])
  })

  it('goes to points for when head to head is split', () => {
    const results = [game('A', 'B', 100, 90), game('B', 'A', 150, 90)]
    expect(playoffSeeding(teams.slice(0, 2), results).map((r) => [r.memberId, r.tiebreak])).toEqual([
      ['B', 'points'],
      ['A', 'points'],
    ])
  })

  it('in a 3+-way tie, uses each team\'s record against the whole group, then points for whoever is still level', () => {
    // A, B, C all 3-3. Among themselves A and B are both 2-1 and C 1-3. B beat A when they met, but
    // A and B are level on the GROUP record, so points for decides — as the old site and the 2025
    // Masters bracket did — not their own meeting.
    const results = [
      game('B', 'A', 90, 80),
      game('A', 'C', 200, 80),
      game('A', 'C', 200, 80),
      game('C', 'B', 90, 80),
      game('B', 'C', 90, 80),
      game('A', 'X'), game('X', 'A'), game('X', 'A'),
      game('B', 'X'), game('X', 'B'), game('X', 'B'),
      game('C', 'X'), game('C', 'X'),
    ]
    const rows = playoffSeeding(teams.slice(0, 3), results)
    expect(rows.map((r) => r.memberId)).toEqual(['A', 'B', 'C'])
    expect(rows.map((r) => r.tiebreak)).toEqual(['points', 'points', 'h2h'])
  })

  it('counts a tie as half a win, on the record and head to head', () => {
    const rows = playoffSeeding(teams.slice(0, 2), [{ memberIds: ['A', 'B'], winnerId: null, scores: [90, 90] }, game('A', 'X')])
    expect(rows[0]).toMatchObject({ memberId: 'A', wins: 1, ties: 1, winPct: 0.75 })
  })

  it('treats teams that have not met as level head to head', () => {
    expect(seedsOf(teams.slice(0, 2), [game('A', 'X', 90), game('B', 'X', 120)])).toEqual(['B', 'A'])
  })
})

describe('playoffSeeding — reproduces the real 2025 playoff fields', () => {
  // The brackets record the seeding that was used: the two teams that skip the first round are
  // seeds 1–2, and the quarterfinals are 3 v 6 and 4 v 5.
  it.each([
    ['Premier', premier2025],
    ['Masters', masters2025],
    ['National', national2025],
  ])('%s', (_, json) => {
    const season = json as unknown as SeasonData
    const seedOf = new Map(playoffSeeding(season.teams, playedResults(season)).map((r) => [r.memberId, r.seed]))
    const bracket = season.games.filter((g) => g.isPlayoff && g.bracket === 'championship')
    const pairs = (week: number) => bracket.filter((g) => g.week === week).map((g) => g.participants.map((p) => p.memberId))
    const quarters = pairs(15)
    const inQuarters = new Set(quarters.flat())
    const byes = pairs(16).flat().filter((id) => !inQuarters.has(id))
    expect(byes.map((id) => seedOf.get(id)).sort()).toEqual([1, 2])
    expect(quarters.map((pair) => pair.map((id) => seedOf.get(id)!).sort().join('v')).sort()).toEqual(['3v6', '4v5'])
  })
})
