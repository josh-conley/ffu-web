import type { DraftData, DraftPick } from '@/data'
import { isTraded, pickLabel, teamsBySlot } from './draft'

const pick = (overall: number, round: number, slot: number, memberId: string): DraftPick => ({
  overall,
  round,
  slot,
  memberId,
  player: { id: String(overall), name: `Player ${overall}`, position: 'WR' },
})

const draft = (over: Partial<DraftData>): DraftData => ({
  schemaVersion: 1,
  tier: 'PREMIER',
  year: '2024',
  draftId: 'd1',
  type: 'snake',
  rounds: 2,
  draftOrder: {},
  picks: [],
  ...over,
})

describe('teamsBySlot', () => {
  it('maps slot → owner from draftOrder', () => {
    const bySlot = teamsBySlot(draft({ draftOrder: { 'ffu-001': 1, 'ffu-002': 2 } }))
    expect(bySlot.get(1)).toBe('ffu-001')
    expect(bySlot.get(2)).toBe('ffu-002')
  })

  it('falls back to round-1 picks when draftOrder is empty', () => {
    const bySlot = teamsBySlot(
      draft({ draftOrder: {}, picks: [pick(1, 1, 1, 'ffu-009'), pick(2, 1, 2, 'ffu-003')] }),
    )
    expect(bySlot.get(1)).toBe('ffu-009')
    expect(bySlot.get(2)).toBe('ffu-003')
  })
})

describe('pickLabel', () => {
  // 12-team snake: odd rounds run with slot; even rounds reverse, so the within-round position is
  // derived from `overall`, not `slot`.
  it('reads slot directly in odd rounds', () => {
    expect(pickLabel(pick(4, 1, 4, 'x'), 12)).toBe('1.04')
    expect(pickLabel(pick(52, 5, 4, 'x'), 12)).toBe('5.04')
  })

  it('reverses in even rounds (overall-derived, not slot)', () => {
    // round 6, slot 4, overall 69 → within-round pick 9, not 4
    expect(pickLabel(pick(69, 6, 4, 'x'), 12)).toBe('6.09')
    // round 2, slot 12 is the FIRST pick of the round
    expect(pickLabel(pick(13, 2, 12, 'x'), 12)).toBe('2.01')
  })

  it('falls back to slot when team count is unknown', () => {
    expect(pickLabel(pick(5, 1, 5, 'x'), 0)).toBe('1.05')
  })
})

describe('isTraded', () => {
  const bySlot = teamsBySlot(draft({ draftOrder: { 'ffu-001': 4, 'ffu-011': 8 } }))

  it('is false when the drafter is the slot owner', () => {
    expect(isTraded(pick(4, 1, 4, 'ffu-001'), bySlot)).toBe(false)
  })

  it('is true when the drafter differs from the slot owner', () => {
    expect(isTraded(pick(52, 5, 4, 'ffu-011'), bySlot)).toBe(true)
  })

  it('is false for a slot with no recorded owner', () => {
    expect(isTraded(pick(1, 1, 1, 'ffu-001'), bySlot)).toBe(false)
  })
})
