import type { Game, SeasonData, Tournament } from '@/data'
import type { Tier } from '@/config/types'
import { resolveTournament, weekScore } from './tournament'
import realTournament from '../../public/data/2025/tournament.json'
import premier2025 from '../../public/data/2025/premier.json'
import masters2025 from '../../public/data/2025/masters.json'
import national2025 from '../../public/data/2025/national.json'

// A season is just enough Game rows to give each ffuId a score per week. Each "game" pairs the team
// with a throwaway opponent so scoreFor finds it; only the team's own score matters to the engine.
function seasonWith(tier: Tier, scores: Record<string, Record<number, number>>): SeasonData {
  const games: Game[] = []
  for (const [ffuId, byWeek] of Object.entries(scores)) {
    for (const [week, score] of Object.entries(byWeek)) {
      games.push({ week: Number(week), isPlayoff: false, participants: [{ memberId: ffuId, score }, { memberId: `${ffuId}-opp`, score: 0 }] })
    }
  }
  return { schemaVersion: 1, tier, year: '2025', era: 'sleeper', platformLeagueId: 'x', teams: [], games }
}

// Four teams, single-tier for brevity. Week 6 = opening round, week 7 = semis, week 8 = final.
const seasons = {
  PREMIER: seasonWith('PREMIER', {
    a: { 6: 100, 7: 90, 8: 70 },
    b: { 6: 80, 7: 50 },
    c: { 6: 110, 7: 95, 8: 120 },
    d: { 6: 60 },
  }),
}

const base: Tournament = {
  schemaVersion: 1,
  name: 'Test Cup',
  year: '2025',
  participants: [
    { ffuId: 'a', tier: 'PREMIER' },
    { ffuId: 'b', tier: 'PREMIER' },
    { ffuId: 'c', tier: 'PREMIER' },
    { ffuId: 'd', tier: 'PREMIER' },
  ],
  rounds: [
    { key: 'r4', label: 'Round of 4', week: 6, matchups: [{ a: 'a', b: 'b' }, { a: 'c', b: 'd' }] },
    { key: 'final', label: 'Final', week: 7 },
  ],
}

describe('weekScore', () => {
  it('finds a team score in its tier for a week', () => {
    expect(weekScore(seasons, 'PREMIER', 'a', 6)).toBe(100)
    expect(weekScore(seasons, 'PREMIER', 'a', 8)).toBe(70)
  })
  it('is undefined for a missing week or missing tier', () => {
    expect(weekScore(seasons, 'PREMIER', 'b', 8)).toBeUndefined()
    expect(weekScore(seasons, 'MASTERS', 'a', 6)).toBeUndefined()
  })
})

describe('resolveTournament', () => {
  it('derives winners from week scores and auto-pairs the next round by adjacency', () => {
    const r = resolveTournament(base, seasons)
    expect(r.rounds[0]!.matchups[0]!.winner).toBe('a') // 100 > 80
    expect(r.rounds[0]!.matchups[1]!.winner).toBe('c') // 110 > 60
    // Final is unauthored: winners a & c paired automatically, scored at week 7.
    const final = r.rounds[1]!.matchups
    expect(final).toHaveLength(1)
    expect(final[0]!.a.ffuId).toBe('a')
    expect(final[0]!.b.ffuId).toBe('c')
    expect(final[0]!.winner).toBe('c') // 95 > 90
    expect(r.champion).toBe('c')
  })

  it('marks a matchup undecided when a week has no score data yet', () => {
    const noData = resolveTournament(
      { ...base, rounds: [{ key: 'r4', label: 'R4', week: 14, matchups: base.rounds[0]!.matchups }] },
      seasons,
    )
    expect(noData.rounds[0]!.matchups[0]!.winner).toBeUndefined()
    expect(noData.champion).toBeUndefined()
  })

  it('reports a tie as undecided (no winner)', () => {
    const tied = seasonWith('PREMIER', { a: { 6: 100 }, b: { 6: 100 } })
    const t: Tournament = { ...base, rounds: [{ key: 'r2', label: 'R2', week: 6, matchups: [{ a: 'a', b: 'b' }] }] }
    const r = resolveTournament(t, { PREMIER: tied })
    expect(r.rounds[0]!.matchups[0]!.tie).toBe(true)
    expect(r.rounds[0]!.matchups[0]!.winner).toBeUndefined()
  })

  it('drops the lowest-scoring winner before a dropLowestWinner round', () => {
    // 3 opening matchups → 3 winners (x:120, y:80, z:150 in week 6). Drop lowest (y) before the
    // next round, leaving x & z to pair.
    const s = seasonWith('PREMIER', {
      x: { 6: 120, 7: 40 }, x2: { 6: 10 },
      y: { 6: 80, 7: 200 }, y2: { 6: 10 },
      z: { 6: 150, 7: 60 }, z2: { 6: 10 },
    })
    const t: Tournament = {
      schemaVersion: 1, name: 'Drop', year: '2025',
      participants: ['x', 'x2', 'y', 'y2', 'z', 'z2'].map((ffuId) => ({ ffuId, tier: 'PREMIER' as Tier })),
      rounds: [
        { key: 'r6', label: 'R6', week: 6, matchups: [{ a: 'x', b: 'x2' }, { a: 'y', b: 'y2' }, { a: 'z', b: 'z2' }] },
        { key: 'r2', label: 'R2', week: 7, dropLowestWinner: true },
      ],
    }
    const r = resolveTournament(t, { PREMIER: s })
    const second = r.rounds[1]!
    expect(second.dropped.map((d) => d.ffuId)).toEqual(['y']) // y won with 80, the lowest winner
    expect(second.matchups).toHaveLength(1)
    expect(second.matchups[0]!.a.ffuId).toBe('x')
    expect(second.matchups[0]!.b.ffuId).toBe('z')
    expect(second.matchups[0]!.winner).toBe('z') // week 7: z 60 > x 40
  })

  it('lets an authored round override the computed pairing', () => {
    const t: Tournament = {
      ...base,
      rounds: [base.rounds[0]!, { key: 'final', label: 'Final', week: 7, matchups: [{ a: 'a', b: 'c' }] }],
    }
    const r = resolveTournament(t, seasons)
    expect(r.rounds[1]!.matchups[0]!.a.ffuId).toBe('a')
    expect(r.rounds[1]!.matchups[0]!.b.ffuId).toBe('c')
  })
})

// Resolves the real seeded 2025 bracket against the actual tier data, proving the full structure
// holds end-to-end: 36 → 18 → 9 → (drop 1) → 8 → 4 → 2 → champion.
describe('the seeded 2025 tournament resolves to a full bracket', () => {
  const real = resolveTournament(realTournament as Tournament, {
    PREMIER: premier2025 as SeasonData,
    MASTERS: masters2025 as SeasonData,
    NATIONAL: national2025 as SeasonData,
  })
  const round = (key: string) => real.rounds.find((r) => r.key === key)!

  it('has 36 participants and the five expected rounds', () => {
    expect((realTournament as Tournament).participants).toHaveLength(36)
    expect(real.rounds.map((r) => r.key)).toEqual(['r36', 'r18', 'r8', 'r4', 'final'])
  })

  it('plays out 18 → 9 → 8 → 4 → 1 matchups, dropping exactly one before the Round of 8', () => {
    expect(round('r36').matchups).toHaveLength(18)
    expect(round('r18').matchups).toHaveLength(9)
    expect(round('r8').dropped).toHaveLength(1)
    expect(round('r8').matchups).toHaveLength(4)
    expect(round('r4').matchups).toHaveLength(2)
    expect(round('final').matchups).toHaveLength(1)
  })

  it('decides every matchup (data exists for all weeks) and crowns a champion', () => {
    for (const r of real.rounds) {
      for (const m of r.matchups) expect(m.winner, `${r.key} matchup`).toBeDefined()
    }
    expect(real.champion).toBeDefined()
  })
})
