import type { SeasonData } from '@/data'
import { careerStats, careerFor, membersByLeague } from './career'
import premier2024 from '../../public/data/2024/premier.json'

const seasons: SeasonData[] = [
  {
    schemaVersion: 1, tier: 'PREMIER', year: '2023', era: 'sleeper', platformLeagueId: 'x',
    teams: [
      { memberId: 'a', record: { wins: 10, losses: 4, ties: 0 }, points: { for: 1500, against: 1300 }, finalPlacement: 1, promoted: false, relegated: false },
      { memberId: 'b', record: { wins: 4, losses: 10, ties: 0 }, points: { for: 1200, against: 1450 }, finalPlacement: 8, promoted: false, relegated: false },
    ],
    games: [
      { week: 16, isPlayoff: true, round: 'Championship', bracket: 'championship', participants: [{ memberId: 'a', score: 130 }, { memberId: 'b', score: 90 }] },
    ],
  },
  {
    schemaVersion: 1, tier: 'PREMIER', year: '2024', era: 'sleeper', platformLeagueId: 'x',
    teams: [
      { memberId: 'a', record: { wins: 7, losses: 7, ties: 0 }, points: { for: 1400, against: 1400 }, finalPlacement: 2, promoted: false, relegated: false },
    ],
    games: [],
  },
]

describe('careerStats (synthetic)', () => {
  const career = careerStats(seasons)

  it('sums record/points across seasons and counts placements', () => {
    const a = career.get('a')!
    expect(a.seasons).toBe(2)
    expect({ w: a.wins, l: a.losses }).toEqual({ w: 17, l: 11 })
    expect(a.pointsFor).toBe(2900)
    expect(a.championships).toBe(1) // 2023 finalPlacement 1
    expect(a.runnerUps).toBe(1) // 2024 finalPlacement 2
    expect(a.bestFinish).toBe(1)
    expect(a.playoffAppearances).toBe(1) // reached the 2023 championship bracket
    expect(a.firstYear).toBe(2023) // FFU debut (derived, not a stored joinedYear)
    expect(a.lastYear).toBe(2024)
    expect(a.isActive).toBe(true) // played the latest season (2024)
  })

  it('marks a member who missed the latest season inactive', () => {
    const b = careerStats(seasons).get('b')!
    expect(b.lastYear).toBe(2023)
    expect(b.isActive).toBe(false) // last played 2023; latest season is 2024
  })
})

describe('careerFor (real 2024 Premier)', () => {
  it('credits the 2024 champion (ffu-009) with a championship', () => {
    const c = careerFor([premier2024 as unknown as SeasonData], 'ffu-009')
    expect(c?.championships).toBe(1)
    expect(c?.bestFinish).toBe(1)
  })
})

describe('membersByLeague', () => {
  const { current, past } = membersByLeague(seasons)

  it('groups active members by their latest-season league', () => {
    // latest season is 2024 Premier; only 'a' played it
    expect(current).toEqual([{ tier: 'PREMIER', members: [expect.objectContaining({ memberId: 'a' })] }])
  })

  it('puts members who missed the latest season in past', () => {
    expect(past.map((c) => c.memberId)).toEqual(['b']) // last played 2023
  })
})
