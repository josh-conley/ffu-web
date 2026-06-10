import type { SeasonData } from '@/data'
import { careerStats, careerFor, careerUpr, championshipTitles, currentLeague, membersByLeague } from './career'
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

  it('derives the current league for active members only', () => {
    expect(currentLeague(career.get('a')!)).toBe('PREMIER')
    expect(currentLeague(career.get('b')!)).toBeUndefined() // inactive → no current league
  })

  it('exposes championship titles + playoff tiers by league', () => {
    const a = careerStats(seasons).get('a')!
    expect(championshipTitles(a)).toEqual([{ year: '2023', tier: 'PREMIER' }]) // won 2023 Premier
    expect(a.playoffTiers).toEqual(['PREMIER']) // reached the 2023 Premier championship bracket
  })

  it('derives the old-site career columns (playoff record, finishes, high/low, tier counts, avg rank)', () => {
    const a = careerStats(seasons).get('a')!
    // Playoff W-L via the placement map: 2023 1st → 2-0, 2024 2nd → 2-1.
    expect({ w: a.playoffWins, l: a.playoffLosses }).toEqual({ w: 4, l: 1 })
    expect(a.thirdPlaceFinishes).toBe(0)
    expect(a.lastPlaceFinishes).toBe(0)
    // Only the 2023 championship game has scores for 'a' (130); 2024 had no games.
    expect(a.careerHighGame).toBe(130)
    expect(a.careerLowGame).toBe(130)
    expect({ p: a.premierSeasons, m: a.mastersSeasons, n: a.nationalSeasons }).toEqual({ p: 2, m: 0, n: 0 })
    expect(a.averageSeasonRank).toBe(1.5) // placements 1 and 2
  })

  it('credits playoff losers and a no-bracket placement correctly', () => {
    const b = careerStats(seasons).get('b')!
    // 2023 finalPlacement 8 → outside the top-6 bracket → no playoff record.
    expect({ w: b.playoffWins, l: b.playoffLosses }).toEqual({ w: 0, l: 0 })
    expect(b.careerHighGame).toBe(90) // scored 90 in the 2023 game
    expect(b.averageSeasonRank).toBe(8)
  })
})

describe('careerUpr (mean of per-season UPRs)', () => {
  // Two seasons of regular-season games for 'x', each with its OWN high/low, so the average-of-
  // seasons result is distinct from a pooled-career UPR (which would be 131.5 here).
  const uprSeasons: SeasonData[] = [
    {
      schemaVersion: 1, tier: 'PREMIER', year: '2020', era: 'sleeper', platformLeagueId: 'x',
      teams: [],
      games: [
        { week: 1, isPlayoff: false, participants: [{ memberId: 'x', score: 110 }, { memberId: 'y', score: 90 }] },
        { week: 2, isPlayoff: false, participants: [{ memberId: 'x', score: 100 }, { memberId: 'y', score: 105 }] },
      ],
    },
    {
      schemaVersion: 1, tier: 'PREMIER', year: '2021', era: 'sleeper', platformLeagueId: 'x',
      teams: [],
      games: [
        { week: 1, isPlayoff: false, participants: [{ memberId: 'x', score: 130 }, { memberId: 'y', score: 120 }] },
        { week: 2, isPlayoff: false, participants: [{ memberId: 'x', score: 70 }, { memberId: 'y', score: 60 }] },
      ],
    },
  ]

  it('averages each season UPR rather than pooling all games', () => {
    // 2020 UPR = (105*6 + (110+100)*2 + 0.5*400)/10 = 125; 2021 = (100*6 + (130+70)*2 + 400)/10 = 140.
    expect(careerUpr(uprSeasons).get('x')).toBeCloseTo(132.5, 5) // mean(125, 140), not pooled 131.5
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
