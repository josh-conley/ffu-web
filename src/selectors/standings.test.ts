import type { SeasonData, SeasonTeam } from '@/data'
import { divisionWinnerIds, finalStandings, regularSeasonStandings, standingsByDivision, winPct } from './standings'
import national2020 from '../../public/data/2020/national.json'
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

describe('finalStandings (real 2024 Premier)', () => {
  const rows = finalStandings(premier2024 as unknown as SeasonData)

  it('orders by finalPlacement, with rank = finalPlacement (the champion is on top)', () => {
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(rows[0]?.team.finalPlacement).toBe(1)
    for (const r of rows) expect(r.rank).toBe(r.team.finalPlacement)
  })

  it('falls back to regular-season seeding when a season is unfinished', () => {
    const season = { teams: [team('a', 3, 0, 300, { finalPlacement: undefined }), team('b', 1, 2, 100, { finalPlacement: undefined })], divisions: [], games: [] } as unknown as SeasonData
    expect(finalStandings(season).map((r) => r.team.memberId)).toEqual(['a', 'b']) // by record, no finish yet
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
    // ESPN-era National — Sleeper years and ESPN Premier (backfilled) all have divisions now.
    expect(standingsByDivision(national2020 as unknown as SeasonData)).toBeNull()
  })
})

describe('divisionWinnerIds (pennants)', () => {
  it('picks the best regular-season record in each division', () => {
    const season = {
      divisions: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
      teams: [
        team('a', 10, 4, 1500, { divisionId: 1 }),
        team('b', 8, 6, 1400, { divisionId: 1 }),
        team('c', 4, 10, 1200, { divisionId: 2 }),
        team('d', 6, 8, 1300, { divisionId: 2 }),
      ],
      games: [],
    } as unknown as SeasonData
    expect(divisionWinnerIds(season)).toEqual(new Set(['a', 'd']))
  })

  it('breaks record ties by points, and shares the pennant on exact ties', () => {
    const season = {
      divisions: [{ id: 1, name: 'A' }],
      teams: [team('a', 8, 6, 1400, { divisionId: 1 }), team('b', 8, 6, 1400, { divisionId: 1 }), team('c', 8, 6, 1300, { divisionId: 1 })],
      games: [],
    } as unknown as SeasonData
    expect(divisionWinnerIds(season)).toEqual(new Set(['a', 'b']))
  })

  it('is empty for ESPN-era seasons (no divisions)', () => {
    expect(divisionWinnerIds(national2020 as unknown as SeasonData).size).toBe(0)
  })

  it('finds one winner per division in real (backfilled) 2024 Premier', () => {
    expect(divisionWinnerIds(premier2024 as unknown as SeasonData).size).toBe(3)
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
