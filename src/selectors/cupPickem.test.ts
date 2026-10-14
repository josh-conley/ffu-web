import type { Game, SeasonData } from '@/data'
import type { Tier } from '@/config/types'
import { cupDraw, drawnCup, seedOf } from '@/test/drawnCup'
import { EMPTY_PICKS, pickBracket, setDrop, setWinner, type CupPicks } from '@/lib/cupPickem'
import { resolveTournament } from './tournament'
import { maxPickemPoints, rankPickem, scorePickem } from './cupPickem'

const t = drawnCup

/** Each team scores `score(seed, week)` in its own tier (undefined = that week not played yet). */
function played(score: (seed: number, week: number) => number | undefined) {
  const seasons: Partial<Record<Tier, SeasonData>> = {}
  for (const tier of ['PREMIER', 'MASTERS', 'NATIONAL'] as Tier[]) {
    const games: Game[] = []
    for (const p of cupDraw.participants.filter((x) => x.tier === tier)) {
      for (const week of [6, 7, 8, 10, 12]) {
        const points = score(p.seed, week)
        if (points !== undefined) games.push({ week, isPlayoff: false, participants: [{ memberId: p.ffuId, score: points }, { memberId: `${p.ffuId}-opp`, score: 0 }] })
      }
    }
    seasons[tier] = { schemaVersion: 1, tier, year: '2026', era: 'sleeper', platformLeagueId: 'x', teams: [], games }
  }
  return resolveTournament(t, seasons)
}

/** A bracket where the better seed always wins and the worst Round of 18 winner is the drop. */
function chalkPicks(): CupPicks {
  let picks = EMPTY_PICKS
  for (const round of t.rounds) {
    pickBracket(t, picks).find((r) => r.key === round.key)!.slots.forEach((s, j) => {
      picks = setWinner(t, picks, round.key, j, seedOf.get(s.a!)! < seedOf.get(s.b!)! ? s.a! : s.b!)
    })
    const r = pickBracket(t, picks).find((x) => x.key === round.key)!
    if (r.needsDrop) picks = setDrop(t, picks, round.key, r.slots.map((s) => s.pick!).reduce((x, y) => (seedOf.get(x)! > seedOf.get(y)! ? x : y)))
  }
  return picks
}

const chalk = pickBracket(t, chalkPicks())
const chalkScore = (seed: number) => 200 - seed

describe('scorePickem', () => {
  it('scores nothing yet but keeps every point possible before a game is played', () => {
    expect(scorePickem(chalk, played(() => undefined))).toEqual({ points: 0, maxPoints: 84, correct: 0 })
  })

  it('pays doubling points per round for a perfect bracket', () => {
    expect(scorePickem(chalk, played(chalkScore))).toEqual({ points: 84, maxPoints: 84, correct: 34 })
  })

  it('loses the points riding on a team once it is knocked out', () => {
    // Seed 36 upsets seed 1 in the opening round; nothing after week 6 is played yet.
    const opening = played((seed, week) => (week !== 6 ? undefined : seed === 36 ? 500 : chalkScore(seed)))
    // 17 of 18 right; seed 1 was picked to win every round, so 2+4+8+16 more can no longer come.
    expect(scorePickem(chalk, opening)).toEqual({ points: 17, maxPoints: 84 - 1 - 30, correct: 17 })
  })
})

describe('maxPickemPoints', () => {
  it('is the same 16 points from every round of the 36-team Cup', () => {
    expect(maxPickemPoints(pickBracket(t, EMPTY_PICKS))).toBe(84)
  })
})

describe('rankPickem', () => {
  it('ranks by points, then points still possible, sharing tied ranks', () => {
    const score = (points: number, maxPoints: number) => ({ points, maxPoints, correct: 0 })
    const ranked = rankPickem([score(5, 20), score(9, 9), score(5, 30), score(5, 20)], (s) => s)
    expect(ranked.map((r) => [r.score.points, r.score.maxPoints, r.rank])).toEqual([[9, 9, 1], [5, 30, 2], [5, 20, 3], [5, 20, 3]])
  })
})
