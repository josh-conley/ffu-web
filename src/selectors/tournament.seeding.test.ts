import type { Game, SeasonData, Tournament } from '@/data'
import type { Tier } from '@/config/types'
import { bracketPositions, bracketSlots, drawCup, makeRng } from '@/lib/cupDraw.mjs'
import { resolveTournament, type ResolvedMatchup } from './tournament'

// The whole Cup bracket, seeded: if every higher seed wins, the Round of 18 is 1v18 … 9v10, the
// quarterfinals 1v8, 4v5, 2v7, 3v6, the semis 1v4 and 2v3, and the top two meet only in the final.

const mk = (p: string) => Array.from({ length: 12 }, (_, i) => ({ ffuId: `${p}-${i + 1}`, name: `${p} ${i + 1}` }))
const draw = drawCup({ PREMIER: mk('p'), MASTERS: mk('m'), NATIONAL: mk('n') }, '47')
const seedOf = new Map(draw.participants.map((p) => [p.ffuId, p.seed]))

/** Every team scores `score(seed, week)` in every Cup week, in its own tier's season (undefined = not played yet). */
function seasonsScoring(score: (seed: number, week: number) => number | undefined): Partial<Record<Tier, SeasonData>> {
  const out: Partial<Record<Tier, SeasonData>> = {}
  for (const tier of ['PREMIER', 'MASTERS', 'NATIONAL'] as Tier[]) {
    const games: Game[] = []
    for (const p of draw.participants.filter((x) => x.tier === tier)) {
      for (const week of [6, 7, 8, 10, 12]) {
        const points = score(p.seed, week)
        if (points !== undefined) games.push({ week, isPlayoff: false, participants: [{ memberId: p.ffuId, score: points }, { memberId: `${p.ffuId}-opp`, score: 0 }] })
      }
    }
    out[tier] = { schemaVersion: 1, tier, year: '2026', era: 'sleeper', platformLeagueId: 'x', teams: [], games }
  }
  return out
}

const tournament: Tournament = {
  schemaVersion: 1,
  name: 'FFU Cup',
  year: '2026',
  fieldSize: 36,
  participants: draw.participants,
  rounds: [
    { key: 'r36', label: 'Round of 36', week: 6, matchups: bracketSlots(draw).map((i) => draw.matchups[i]!) },
    { key: 'r18', label: 'Round of 18', week: 7 },
    { key: 'r8', label: 'Quarterfinals', week: 8, dropLowestWinner: true, reseed: true },
    { key: 'r4', label: 'Semifinals', week: 10 },
    { key: 'final', label: 'Final', week: 12 },
  ],
}

const seeds = (m: ResolvedMatchup) => [seedOf.get(m.a.ffuId)!, seedOf.get(m.b.ffuId)!].sort((x, y) => x - y)
const pairings = (t: ReturnType<typeof resolveTournament>, key: string) => t.rounds.find((r) => r.key === key)!.matchups.map(seeds)

describe('bracketPositions', () => {
  it('mirrors each seed so the top two sit in opposite halves', () => {
    expect(bracketPositions(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
    expect(bracketPositions(4)).toEqual([1, 4, 2, 3])
  })
})

describe('the seeded Cup bracket', () => {
  it('keeps 1 and 2 apart until the final when every higher seed wins', () => {
    const chalk = resolveTournament(tournament, seasonsScoring((seed) => 200 - seed))
    // Stacked in bracket order: seed 1's quarter, then 8, 4, 5; seed 2's half below; 9v10 last.
    expect(pairings(chalk, 'r18')).toEqual([[1, 18], [8, 11], [4, 15], [5, 14], [2, 17], [7, 12], [3, 16], [6, 13], [9, 10]])
    // Seed 9 is the lowest-scoring winner, so it is the one dropped.
    expect(chalk.rounds.find((r) => r.key === 'r18')!.dropped.map((d) => seedOf.get(d.ffuId))).toEqual([9])
    expect(pairings(chalk, 'r8')).toEqual([[1, 8], [4, 5], [2, 7], [3, 6]])
    expect(pairings(chalk, 'r4')).toEqual([[1, 4], [2, 3]])
    expect(pairings(chalk, 'final')).toEqual([[1, 2]])
  })

  it('re-seeds the quarterfinals around whichever winner is dropped', () => {
    // Higher seeds still win every game, but in week 7 seed 3 wins with the lowest winning score.
    const week7 = (seed: number) => (seed === 3 ? 150 : seed <= 9 ? 200 - seed : 100 - seed)
    const t = resolveTournament(tournament, seasonsScoring((seed, week) => (week === 7 ? week7(seed) : 200 - seed)))
    expect(t.rounds.find((r) => r.key === 'r18')!.dropped.map((d) => seedOf.get(d.ffuId))).toEqual([3])
    // Survivors 1,2,4,5,6,7,8,9 → ranked 1–8 → best v worst, in bracket order.
    expect(pairings(t, 'r8')).toEqual([[1, 9], [5, 6], [2, 8], [4, 7]])
  })

  it('keeps the two best seeds left apart until the final, whatever the upsets', () => {
    // Random scores every week: any team can win, and any Round-of-18 winner can be the one dropped.
    const rng = makeRng('upsets')
    let decided = 0
    for (let trial = 0; trial < 200; trial++) {
      const scores = new Map<string, number>()
      const t = resolveTournament(tournament, seasonsScoring((seed, week) => {
        const key = `${seed}-${week}`
        if (!scores.has(key)) scores.set(key, Math.round(rng() * 10000) / 100)
        return scores.get(key)
      }))
      const qf = pairings(t, 'r8')
      if (qf.length !== 4) continue // a tie left a round undecided
      decided++
      const ranked = qf.flat().sort((x, y) => x - y)
      const half = (seed: number) => (qf.findIndex((m) => m.includes(seed)) < 2 ? 'top' : 'bottom')
      expect(half(ranked[0]!)).not.toBe(half(ranked[1]!))
      // And the quarterfinals are best v worst among the eight: 1v8, 4v5, 2v7, 3v6 by rank.
      const rankOf = (seed: number) => ranked.indexOf(seed) + 1
      expect(qf.map((m) => m.map(rankOf))).toEqual([[1, 8], [4, 5], [2, 7], [3, 6]])
    }
    expect(decided).toBeGreaterThan(190)
  })

  it('pairs no round until the one before it is fully decided', () => {
    // Week 7 has no scores yet: the Round of 18 is set, but nothing after it.
    const t = resolveTournament(tournament, seasonsScoring((seed, week) => (week === 7 ? undefined : 200 - seed)))
    expect(pairings(t, 'r18')).toHaveLength(9)
    expect(pairings(t, 'r8')).toEqual([])
  })
})
