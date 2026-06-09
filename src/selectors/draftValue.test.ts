import { describe, expect, it } from 'vitest'
import type { DraftData, DraftPick, DraftPlayer, SeasonLineups } from '@/data'
import { draftValues, memberDraftValues } from './draftValue'

function pick(overall: number, memberId: string, id: string, position: string): DraftPick {
  const player: DraftPlayer = { id, name: `Player ${id}`, position }
  return { overall, round: Math.ceil(overall / 2), slot: ((overall - 1) % 2) + 1, memberId, player }
}

const DRAFT: DraftData = {
  schemaVersion: 1,
  tier: 'PREMIER',
  year: '2024',
  draftId: 'd1',
  type: 'snake',
  rounds: 3,
  draftOrder: { m1: 1, m2: 2 },
  picks: [
    pick(1, 'm1', 'rbA', 'RB'), // RB1 by draft
    pick(2, 'm2', 'rbB', 'RB'), // RB2 by draft
    pick(3, 'm2', 'qbA', 'QB'),
    pick(4, 'm1', 'rbC', 'RB'), // RB3 by draft
    pick(5, 'm1', 'qbB', 'QB'),
    pick(6, 'm2', 'rbD', 'RB'), // RB4, never appears in a lineup (cut in camp)
  ],
}

// rbC vastly outproduces both RBs taken ahead; qbA edges qbB. Points accrue across rosters
// (rbA gets benched somewhere too) and starts are counted only when started.
const LINEUPS: SeasonLineups = {
  schemaVersion: 1,
  tier: 'PREMIER',
  year: '2024',
  slots: ['QB', 'RB'],
  weeks: [
    {
      week: 1,
      teams: [
        { memberId: 'm1', starters: [{ playerId: 'qbB', points: 18 }, { playerId: 'rbC', points: 22 }], bench: [{ playerId: 'rbA', points: 5 }] },
        { memberId: 'm2', starters: [{ playerId: 'qbA', points: 20 }, { playerId: 'rbB', points: 8 }], bench: [] },
      ],
    },
    {
      week: 2,
      teams: [
        { memberId: 'm1', starters: [{ playerId: 'qbB', points: 10 }, { playerId: 'rbC', points: 30 }], bench: [] },
        { memberId: 'm2', starters: [{ playerId: 'qbA', points: 25 }, { playerId: 'rbA', points: 6 }], bench: [{ playerId: 'rbB', points: 2 }] },
      ],
    },
  ],
}

describe('draftValues', () => {
  const values = draftValues(DRAFT, LINEUPS)
  const byId = new Map(values.map((v) => [v.pick.player.id, v]))

  it('ranks position finish by points accrued on any roster, starts counted separately', () => {
    const rbA = byId.get('rbA')!
    expect(rbA.seasonPoints).toBe(11) // 5 benched + 6 started
    expect(rbA.starts).toBe(1)
    expect(rbA.posPicked).toBe(1)
    expect(rbA.posFinish).toBe(2) // rbC 52 > rbA 11 > rbB 10 > rbD 0
    expect(rbA.value).toBe(-1)
  })

  it('rewards the late pick that finished on top', () => {
    const rbC = byId.get('rbC')!
    expect(rbC.seasonPoints).toBe(52)
    expect(rbC.posPicked).toBe(3)
    expect(rbC.posFinish).toBe(1)
    expect(rbC.value).toBe(2)
  })

  it('scores a never-rostered pick as zero points and last at his position', () => {
    const rbD = byId.get('rbD')!
    expect(rbD.seasonPoints).toBe(0)
    expect(rbD.starts).toBe(0)
    expect(rbD.posFinish).toBe(4)
    expect(rbD.value).toBe(0) // picked RB4, finished RB4 — late flier that missed costs nothing
  })

  it('ranks positions independently (QBs compared only to QBs)', () => {
    expect(byId.get('qbA')!.value).toBe(0) // QB1 picked, QB1 finish (45 pts)
    expect(byId.get('qbB')!.value).toBe(0) // QB2 picked, QB2 finish (28 pts)
  })

  it('returns best value first', () => {
    expect(values[0]!.pick.player.id).toBe('rbC')
  })
})

describe('memberDraftValues', () => {
  it('aggregates per member with best/worst picks, best drafter first', () => {
    const summaries = memberDraftValues(draftValues(DRAFT, LINEUPS))
    expect(summaries.map((s) => s.memberId)).toEqual(['m1', 'm2'])

    const m1 = summaries[0]!
    expect(m1.picks).toBe(3)
    expect(m1.points).toBe(11 + 52 + 28)
    expect(m1.avgValue).toBeCloseTo((-1 + 2 + 0) / 3)
    expect(m1.best.pick.player.id).toBe('rbC')
    expect(m1.worst.pick.player.id).toBe('rbA')

    const m2 = summaries[1]!
    expect(m2.avgValue).toBeCloseTo(-1 / 3) // rbB: picked RB2, finished RB3
    expect(m2.worst.pick.player.id).toBe('rbB')
  })
})
