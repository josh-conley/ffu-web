import type { Game, SeasonData, SeasonTeam, Tournament, TournamentRound } from '@/data'
import type { Tier } from '@/config'
import { careerWinnings, cupWinnerPurse } from './prizes'

// `record` matters: divisionWinnerIds reads the stored regular-season record to pick division champs.
const team = (memberId: string, finalPlacement: number, opts: { div?: number; w?: number; l?: number } = {}): SeasonTeam => ({
  memberId,
  record: { wins: opts.w ?? 0, losses: opts.l ?? 0, ties: 0 },
  points: { for: 0, against: 0 },
  finalPlacement,
  promoted: false,
  relegated: false,
  ...(opts.div !== undefined ? { divisionId: opts.div } : {}),
})

const game = (week: number, aId: string, aScore: number, bId: string, bScore: number): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: aId, score: aScore },
    { memberId: bId, score: bScore },
  ],
})

const season = (over: Partial<SeasonData>): SeasonData =>
  ({ schemaVersion: 1, era: 'sleeper', platformLeagueId: 'x', teams: [], games: [], ...over }) as SeasonData

describe('careerWinnings — single tier (2021 Premier)', () => {
  // a sweeps: champion + division 1 + most points + both weekly highs. b runner-up + highest loss.
  const s = season({
    tier: 'PREMIER',
    year: '2021',
    divisions: [{ id: 1, name: 'D1' }, { id: 2, name: 'D2' }],
    teams: [team('a', 1, { div: 1, w: 2, l: 0 }), team('b', 2, { div: 1, w: 1, l: 1 }), team('c', 3, { div: 2, w: 1, l: 1 }), team('d', 4, { div: 2, w: 0, l: 2 })],
    games: [game(1, 'a', 100, 'b', 90), game(1, 'c', 80, 'd', 70), game(2, 'a', 110, 'c', 60), game(2, 'b', 95, 'd', 85)],
  })
  const w = careerWinnings([s], [])

  it('pays champion + division + most points + weekly (×2) to the sweeper', () => {
    // 440 champion + 40 division + 45 most points + 10×2 weekly = 545
    expect(w.get('a')?.total).toBe(545)
    expect(w.get('a')?.byTier.PREMIER).toBe(545)
  })

  it('pays runner-up and 3rd + their division title', () => {
    expect(w.get('b')?.total).toBe(190) // runner-up only (a won division 1)
    expect(w.get('c')?.total).toBe(115) // 75 third + 40 division 2
  })

  it('does not pay 2021 floor/score-in-loss prizes (not offered that year), and skips non-winners', () => {
    expect(w.has('d')).toBe(false)
  })
})

describe('careerWinnings — cross-union + cross-league (2024, two tiers)', () => {
  const premier = season({
    tier: 'PREMIER' as Tier,
    year: '2024',
    teams: [team('p1', 1), team('p2', 2)],
    games: [game(1, 'p1', 200, 'p2', 100)],
  })
  const national = season({
    tier: 'NATIONAL' as Tier,
    year: '2024',
    teams: [team('n1', 1), team('n2', 2)],
    games: [game(1, 'n1', 120, 'n2', 110)],
  })
  const w = careerWinnings([premier, national], [])

  it('adds union-wide most-points + weekly and cross-league to the overall leader', () => {
    // p1: 500 champ + 70 most pts + 10 weekly(tier) + 40 union most pts + 10 union weekly + 10 cross-league = 640
    expect(w.get('p1')?.total).toBe(640)
    expect(w.get('p1')?.byTier.PREMIER).toBe(640) // cross-union attributed to the member's tier
  })

  it('pays cross-league to every team in the top-scoring tier (Premier 300 > National 230)', () => {
    expect(w.get('p2')?.total).toBe(210) // 200 runner-up + 10 cross-league
  })

  it('pays National its own tier prizes but no cross prizes (Premier swept those)', () => {
    expect(w.get('n1')?.total).toBe(240) // 200 champ + 40 most points
    expect(w.get('n2')?.total).toBe(90) // runner-up only
  })
})

describe('careerWinnings — a season still being played', () => {
  // Two weeks into 2025, two tiers. Only the weekly high scores are settled; the division title,
  // most points, floor, score-in-loss and every cross-union / cross-league season prize are still
  // just "who leads right now", so none of them may be paid.
  const live = (over: Partial<SeasonTeam>) => ({ ...team('x', 0), ...over, finalPlacement: undefined }) as SeasonTeam
  const premier = season({
    tier: 'PREMIER' as Tier,
    year: '2025',
    divisions: [{ id: 1, name: 'D1' }],
    teams: [live({ memberId: 'p1', divisionId: 1, record: { wins: 2, losses: 0, ties: 0 } }), live({ memberId: 'p2', divisionId: 1, record: { wins: 0, losses: 2, ties: 0 } })],
    games: [game(1, 'p1', 150, 'p2', 140), game(2, 'p1', 130, 'p2', 120)],
  })
  const national = season({
    tier: 'NATIONAL' as Tier,
    year: '2025',
    teams: [live({ memberId: 'n1' }), live({ memberId: 'n2' })],
    games: [game(1, 'n1', 100, 'n2', 90), game(2, 'n1', 145, 'n2', 90)],
  })
  const w = careerWinnings([premier, national], [])

  it('pays each week\'s high scores as the weeks land', () => {
    // p1: Premier weekly high ×2 ($10 each) + union weekly high in week 1 ($10) = 30
    expect(w.get('p1')?.total).toBe(30)
    // n1 has the union's best week-2 score (145 > 130); National has no tier weekly prize.
    expect(w.get('n1')?.total).toBe(10)
  })

  it('pays nothing decided over the whole regular season', () => {
    expect(w.has('p2')).toBe(false) // would be $10 cross-league if Premier's points lead counted
    expect(w.has('n2')).toBe(false)
  })
})

describe('careerWinnings — FFU Cup (2026: $10 / $20 / $40 / $60 / $100)', () => {
  // Cup rounds are scored on each team's ordinary league game that week, so the fixtures are just
  // Premier weeks; the Cup's share is isolated by comparing with and without the tournament.
  const live = (memberId: string) => ({ ...team(memberId, 0), finalPlacement: undefined }) as SeasonTeam
  const premier = (games: Game[]) =>
    season({ tier: 'PREMIER' as Tier, year: '2026', teams: ['a', 'b', 'c', 'd', 'e', 'f'].map(live), games })
  const cup = (rounds: TournamentRound[]): Tournament => ({
    schemaVersion: 1, name: 'FFU Cup', year: '2026', fieldSize: 6, rounds,
    participants: ['a', 'b', 'c', 'd', 'e', 'f'].map((ffuId) => ({ ffuId, tier: 'PREMIER' as Tier })),
  })
  const cupShare = (seasons: SeasonData[], t: Tournament) => {
    const withCup = careerWinnings(seasons, [t])
    const without = careerWinnings(seasons, [])
    return Object.fromEntries([...withCup].map(([id, w]) => [id, w.total - (without.get(id)?.total ?? 0)]).filter(([, n]) => n !== 0))
  }

  const knockout = cup([
    { key: 'r36', label: 'Round of 36', week: 1, matchups: [{ a: 'a', b: 'b' }, { a: 'c', b: 'd' }] },
    { key: 'final', label: 'Final', week: 2 },
  ])
  const week1 = [game(1, 'a', 120, 'c', 100), game(1, 'b', 90, 'd', 95), game(1, 'e', 1, 'f', 0)]
  const week2 = [game(2, 'a', 130, 'd', 80), game(2, 'c', 140, 'b', 70), game(2, 'e', 1, 'f', 0)]

  it('pays each round as its week lands, and nothing for a round not yet played', () => {
    expect(cupShare([premier(week1)], knockout)).toEqual({ a: 10, c: 10 })
  })

  it('pays the champion the final on top of every round they won', () => {
    expect(cupShare([premier([...week1, ...week2])], knockout)).toEqual({ a: 10, c: 110 })
  })

  it('does not pay the winner a round sheds, who won but did not advance', () => {
    const shed = cup([
      { key: 'r18', label: 'Round of 18', week: 1, matchups: [{ a: 'a', b: 'b' }, { a: 'c', b: 'd' }, { a: 'e', b: 'f' }] },
      { key: 'r8', label: 'Quarterfinals', week: 2, dropLowestWinner: true },
    ])
    const games = [game(1, 'a', 150, 'b', 100), game(1, 'c', 120, 'd', 110), game(1, 'e', 101, 'f', 99)]
    expect(cupShare([premier(games)], shed)).toEqual({ a: 20, c: 20 }) // e won on the lowest score
  })

  it('credits Cup money to the league the team plays in', () => {
    expect(careerWinnings([premier(week1)], [knockout]).get('c')?.byTier.PREMIER).toBe(10)
  })
})

describe('cupWinnerPurse', () => {
  const keys = ['r36', 'r18', 'r8', 'r4', 'final'] as const

  it('sums every round a champion wins on the way through', () => {
    expect(cupWinnerPurse({ r36: 10, r18: 20, r8: 40, r4: 60, final: 100 }, keys)).toBe(230)
  })

  it('is undefined when the schedule is missing or any round is unannounced', () => {
    expect(cupWinnerPurse(undefined, keys)).toBeUndefined()
    // A partial total would understate the purse, so refuse rather than half-answer.
    expect(cupWinnerPurse({ r36: 10, r18: 20 }, keys)).toBeUndefined()
  })
})
