import type { SeasonData, SeasonTeam } from '@/data'
import { regularSeasonStandings, standingsByDivision, winPct } from './standings'
import premier2024 from '../../public/data/2024/premier.json'
import premier2025 from '../../public/data/2025/premier.json'

const team = (memberId: string, wins: number, losses: number, pointsFor: number, extra?: Partial<SeasonTeam>): SeasonTeam => ({
  memberId,
  record: { wins, losses, ties: 0 },
  points: { for: pointsFor, against: 0 },
  finalPlacement: 0,
  promoted: false,
  relegated: false,
  ...extra,
})

describe('winPct', () => {
  it('counts ties as half a win', () => {
    expect(winPct({ wins: 7, losses: 7, ties: 0 })).toBeCloseTo(0.5)
    expect(winPct({ wins: 0, losses: 0, ties: 1 })).toBe(0.5)
    expect(winPct({ wins: 0, losses: 0, ties: 0 })).toBe(0)
  })
})

describe('regularSeasonStandings (real 2024 Premier, no divisions)', () => {
  const rows = regularSeasonStandings(premier2024 as unknown as SeasonData)

  it('orders all teams by winPct desc, then pointsFor desc', () => {
    expect(rows).toHaveLength(12)
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1]!
      const cur = rows[i]!
      expect(prev.winPct).toBeGreaterThanOrEqual(cur.winPct)
      if (prev.winPct === cur.winPct) expect(prev.team.points.for).toBeGreaterThanOrEqual(cur.team.points.for)
    }
    expect(rows[0]?.winPct).toBeCloseTo(10 / 14) // best regular-season record was 10-4
  })

  it('is decoupled from finalPlacement (the 8-6 champion was not the #1 seed)', () => {
    // The champion (finalPlacement 1) went 8-6, so standings order != playoff finish.
    expect(rows.some((r) => r.rank !== r.team.finalPlacement)).toBe(true)
    expect(rows[0]?.team.finalPlacement).not.toBe(1)
  })
})

describe('standingsByDivision (real 2025 Premier, divisions)', () => {
  it('groups into the 3 divisions, each sorted by rank, covering every team', () => {
    const groups = standingsByDivision(premier2025 as unknown as SeasonData)
    expect(groups).not.toBeNull()
    expect(groups).toHaveLength(3)
    const total = groups!.reduce((n, g) => n + g.rows.length, 0)
    expect(total).toBe((premier2025 as unknown as SeasonData).teams.length)
    for (const g of groups!) {
      for (let i = 1; i < g.rows.length; i++) expect(g.rows[i - 1]!.rank).toBeLessThanOrEqual(g.rows[i]!.rank)
    }
  })

  it('returns null for a season without divisions', () => {
    expect(standingsByDivision(premier2024 as unknown as SeasonData)).toBeNull()
  })
})

describe('tie handling', () => {
  it('gives tied teams (equal winPct AND pointsFor) the same rank, then skips', () => {
    const season: SeasonData = {
      schemaVersion: 1, tier: 'PREMIER', year: '2024', era: 'sleeper', platformLeagueId: 'x',
      teams: [team('a', 10, 4, 1500), team('b', 10, 4, 1500), team('c', 8, 6, 1400)],
      games: [],
    }
    const rows = regularSeasonStandings(season)
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3])
  })
})
