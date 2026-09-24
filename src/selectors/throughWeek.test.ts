import type { Game, SeasonData } from '@/data'
import { seasonsThroughWeek } from './throughWeek'

const game = (week: number, a: [string, number], b: [string, number], isPlayoff = false): Game => ({
  week,
  isPlayoff,
  participants: [
    { memberId: a[0], score: a[1] },
    { memberId: b[0], score: b[1] },
  ],
})

// Stored totals deliberately differ from the sum of the games (Sleeper's aggregates can), to prove
// the rewind subtracts rather than re-sums.
const season = (year: string, games: Game[]): SeasonData => ({
  schemaVersion: 1, tier: 'PREMIER', year, era: 'sleeper', platformLeagueId: 'x', games,
  teams: [
    { memberId: 'a', record: { wins: 2, losses: 0, ties: 0 }, points: { for: 251, against: 180 }, finalPlacement: 1, placementName: '1st', promoted: false, relegated: false },
    { memberId: 'b', record: { wins: 0, losses: 2, ties: 0 }, points: { for: 180, against: 250 }, finalPlacement: 2, promoted: false, relegated: false },
  ],
})

const played = season('2025', [game(1, ['a', 120], ['b', 100]), game(2, ['a', 130], ['b', 80]), game(15, ['a', 90], ['b', 70], true)])

describe('seasonsThroughWeek', () => {
  it('takes the later games back out of the stored totals', () => {
    const [rewound] = seasonsThroughWeek([played], '2025', 1)
    expect(rewound!.games.map((g) => g.week)).toEqual([1])
    const a = rewound!.teams.find((t) => t.memberId === 'a')!
    expect(a.record).toEqual({ wins: 1, losses: 0, ties: 0 })
    expect(a.points).toEqual({ for: 121, against: 100 }) // 251 - 130, not the 120 the games sum to
  })

  it('withdraws the final placing while games are still to come', () => {
    const [rewound] = seasonsThroughWeek([played], '2025', 14)
    const a = rewound!.teams.find((t) => t.memberId === 'a')!
    expect(a.finalPlacement).toBeUndefined()
    expect(a.placementName).toBeUndefined()
    expect(a.points.for).toBe(251) // a playoff game never counted toward the regular-season totals
  })

  it('leaves a season with nothing after the cut-off untouched', () => {
    expect(seasonsThroughWeek([played], '2025', 15)[0]).toBe(played)
  })

  it('keeps earlier years whole and drops later ones', () => {
    const earlier = season('2024', [game(1, ['a', 1], ['b', 0])])
    const later = season('2026', [game(1, ['a', 1], ['b', 0])])
    const result = seasonsThroughWeek([earlier, played, later], '2025', 1)
    expect(result.map((s) => s.year)).toEqual(['2024', '2025'])
    expect(result[0]).toBe(earlier)
  })

  it('treats week 0 as before the season: no games and no record', () => {
    const [rewound] = seasonsThroughWeek([played], '2025', 0)
    expect(rewound!.games).toEqual([])
    expect(rewound!.teams.every((t) => t.record.wins + t.record.losses + t.record.ties === 0)).toBe(true)
  })
})
