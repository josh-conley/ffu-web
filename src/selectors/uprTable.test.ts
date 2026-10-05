import type { Tier } from '@/config/types'
import type { Game, SeasonData, SeasonTeam } from '@/data'
import { uprTable } from './uprTable'

const game = (week: number, a: [string, number], b: [string, number]): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: a[0], score: a[1] },
    { memberId: b[0], score: b[1] },
  ],
})

/** A one-game-a-week league; each team's stored totals are summed from its games, as Sleeper's are. */
function league(tier: Tier, a: string, b: string, scores: [number, number][]): SeasonData {
  const games = scores.map(([x, y], i) => game(i + 1, [a, x], [b, y]))
  const totals = (id: string): SeasonTeam => {
    const mine = games.map((g) => g.participants.find((p) => p.memberId === id)!.score)
    const theirs = games.map((g) => g.participants.find((p) => p.memberId !== id)!.score)
    const wins = mine.filter((s, i) => s > theirs[i]!).length
    return {
      memberId: id,
      record: { wins, losses: games.length - wins, ties: 0 },
      points: { for: mine.reduce((s, n) => s + n, 0), against: theirs.reduce((s, n) => s + n, 0) },
      promoted: false,
      relegated: false,
    }
  }
  return { year: '2026', tier, era: 'sleeper', games, teams: [totals(a), totals(b)] } as unknown as SeasonData
}

// Weeks 1–3: A 190, C 160, B 100, D 90. Week 4 shakes it up: C 223, B 148.5, A 145, D 79.5.
const seasons = [
  league('PREMIER', 'a', 'b', [[150, 100], [150, 100], [150, 100], [50, 210]]),
  league('NATIONAL', 'c', 'd', [[120, 90], [120, 90], [120, 90], [300, 60]]),
]
const summary = (week: number) => uprTable(seasons, '2026', week).map((r) => [r.memberId, r.rank, r.move])

describe('uprTable', () => {
  it('is empty before the season has a UPR', () => {
    expect(uprTable(seasons, '2026', 2)).toEqual([])
  })

  it('has no movement on the first rated week', () => {
    expect(summary(3)).toEqual([['a', 1, undefined], ['c', 2, undefined], ['b', 3, undefined], ['d', 4, undefined]])
  })

  it('counts places moved since the week before', () => {
    expect(summary(4)).toEqual([['c', 1, 1], ['b', 2, 1], ['a', 3, -2], ['d', 4, 0]])
  })

  it("carries each team's UPR, league and record as of that week", () => {
    const [top] = uprTable(seasons, '2026', 3)
    expect(top).toMatchObject({ memberId: 'a', tier: 'PREMIER', upr: 190, record: { wins: 3, losses: 0, ties: 0 } })
  })
})
