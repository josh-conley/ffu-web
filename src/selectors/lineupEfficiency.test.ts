import { describe, expect, it } from 'vitest'
import type { PlayerMap, SeasonLineups, TeamLineup } from '@/data'
import { careerEfficiency, optimalPoints, seasonEfficiency } from './lineupEfficiency'

const PLAYERS: PlayerMap = {
  qb1: { name: 'QB One', position: 'QB' },
  qb2: { name: 'QB Two', position: 'QB' },
  rb1: { name: 'RB One', position: 'RB' },
  rb2: { name: 'RB Two', position: 'RB' },
  rb3: { name: 'RB Three', position: 'RB' },
  wr1: { name: 'WR One', position: 'WR' },
  wr2: { name: 'WR Two', position: 'WR' },
  te1: { name: 'TE One', position: 'TE' },
  fb1: { name: 'FB One', position: 'FB' },
  db1: { name: 'DB One', position: 'DB' },
  BUF: { name: 'Buffalo Bills', position: 'DEF' },
  MIA: { name: 'Miami Dolphins', position: 'DEF' },
}

const SLOTS = ['QB', 'RB', 'RB', 'WR', 'FLEX', 'DEF']

const lp = (playerId: string, points: number) => ({ playerId, points })

function team(memberId: string, starters: [string, number][], bench: [string, number][]): TeamLineup {
  return { memberId, starters: starters.map(([id, p]) => lp(id, p)), bench: bench.map(([id, p]) => lp(id, p)) }
}

function season(weeks: { week: number; teams: TeamLineup[] }[], slots = SLOTS): SeasonLineups {
  return { schemaVersion: 1, tier: 'PREMIER', year: '2024', slots, weeks }
}

describe('optimalPoints', () => {
  it('equals actual when the started lineup was already best', () => {
    const t = team('m1', [['qb1', 20], ['rb1', 15], ['rb2', 12], ['wr1', 10], ['te1', 8], ['BUF', 5]], [['rb3', 4], ['wr2', 3]])
    expect(optimalPoints(t, SLOTS, PLAYERS)).toBe(70)
  })

  it('swaps in a bench player who outscored a starter at his position', () => {
    const t = team('m1', [['qb1', 20], ['rb1', 15], ['rb2', 2], ['wr1', 10], ['te1', 8], ['BUF', 5]], [['rb3', 14]])
    // rb3 (14) replaces rb2 (2): 20+15+14+10+8+5 = 72
    expect(optimalPoints(t, SLOTS, PLAYERS)).toBe(72)
  })

  it('fills dedicated slots before FLEX so the overflow lands in FLEX', () => {
    // Three RBs outscore the started TE: best two take the RB slots, third takes FLEX.
    const t = team('m1', [['qb1', 20], ['rb1', 6], ['rb2', 5], ['wr1', 10], ['te1', 1], ['BUF', 5]], [['rb3', 18], ['fb1', 7]])
    // RB slots: rb3 18 + fb1 7 (FB is RB-eligible); FLEX: rb1 6 → 20+18+7+10+6+5 = 66
    expect(optimalPoints(t, SLOTS, PLAYERS)).toBe(66)
  })

  it('never drops below actual when a starter has an unmapped or odd position', () => {
    // db1 (position DB, eligible nowhere) was started in FLEX — counts via its started slot.
    const t = team('m1', [['qb1', 20], ['rb1', 15], ['rb2', 12], ['wr1', 10], ['db1', 9], ['BUF', 5]], [])
    expect(optimalPoints(t, SLOTS, PLAYERS)).toBe(71)
  })

  it('considers a benched defense for the DEF slot', () => {
    const t = team('m1', [['qb1', 20], ['rb1', 15], ['rb2', 12], ['wr1', 10], ['te1', 8], ['BUF', 0]], [['MIA', 11]])
    expect(optimalPoints(t, SLOTS, PLAYERS)).toBe(76)
  })
})

describe('seasonEfficiency', () => {
  it('aggregates per member across weeks and only counts weeks they appear in', () => {
    const wk1 = {
      week: 1,
      teams: [
        team('m1', [['qb1', 20], ['rb1', 15], ['rb2', 2], ['wr1', 10], ['te1', 8], ['BUF', 5]], [['rb3', 14]]),
        team('m2', [['qb2', 25], ['rb3', 10], ['fb1', 8], ['wr2', 9], ['te1', 7], ['MIA', 6]], []),
      ],
    }
    const wk2 = { week: 2, teams: [team('m1', [['qb1', 30], ['rb1', 10], ['rb2', 10], ['wr1', 10], ['te1', 10], ['BUF', 10]], [])] }
    const result = seasonEfficiency(season([wk1, wk2]), PLAYERS)

    const m1 = result.get('m1')!
    expect(m1.weeks).toEqual([
      { week: 1, actual: 60, optimal: 72, lost: 12 },
      { week: 2, actual: 80, optimal: 80, lost: 0 },
    ])
    expect(m1.actual).toBe(140)
    expect(m1.optimal).toBe(152)
    expect(m1.lost).toBe(12)
    expect(m1.efficiency).toBeCloseTo(140 / 152)

    const m2 = result.get('m2')!
    expect(m2.weeks).toHaveLength(1)
    expect(m2.lost).toBe(0)
    expect(m2.efficiency).toBe(1)
  })
})

describe('careerEfficiency', () => {
  it('sums across seasons and derives per-game loss', () => {
    const a = season([{ week: 1, teams: [team('m1', [['qb1', 20], ['rb1', 15], ['rb2', 2], ['wr1', 10], ['te1', 8], ['BUF', 5]], [['rb3', 14]])] }])
    const b = season([{ week: 1, teams: [team('m1', [['qb1', 10], ['rb1', 10], ['rb2', 10], ['wr1', 10], ['te1', 10], ['BUF', 10]], [])] }])
    const career = careerEfficiency([a, b], PLAYERS).get('m1')!
    expect(career.games).toBe(2)
    expect(career.actual).toBe(120)
    expect(career.optimal).toBe(132)
    expect(career.lost).toBe(12)
    expect(career.efficiency).toBeCloseTo(120 / 132)
    expect(career.lostPerGame).toBe(6)
  })
})
