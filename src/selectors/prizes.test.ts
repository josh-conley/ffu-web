import type { Game, SeasonData, SeasonTeam } from '@/data'
import type { Tier } from '@/config'
import { careerWinnings } from './prizes'

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
  const w = careerWinnings([s])

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
  const w = careerWinnings([premier, national])

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
