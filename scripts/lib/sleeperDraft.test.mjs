import { describe, expect, it } from 'vitest'
import { latestDraft, toDraftData, toDraftOrder, toPicks } from './sleeperDraft.mjs'

// The end-to-end proof is `npm run backfill-drafts -- --verify 2025`, which rebuilds a completed
// year from Sleeper and diffs 540 picks against the migrated files. These cover the edges.

const members = new Map([
  ['sleeper-a', { ffuId: 'ffu-001', name: 'A' }],
  ['sleeper-b', { ffuId: 'ffu-002', name: 'B' }],
])
const pick = (over, by, id, meta = {}) => ({
  pick_no: over, round: 1, draft_slot: over, picked_by: by, player_id: id,
  metadata: { first_name: 'Jah', last_name: 'Gibbs', position: 'RB', team: 'DET', ...meta },
})

describe('latestDraft', () => {
  it('picks the most recently created, so a mock never shadows the real one', () => {
    expect(latestDraft([{ draft_id: 'old', created: 1 }, { draft_id: 'new', created: 9 }]).draft_id).toBe('new')
  })
  it('is undefined for a league with no drafts', () => {
    expect(latestDraft([])).toBeUndefined()
  })
})

describe('toDraftOrder', () => {
  it('rekeys Sleeper user ids to ffuIds', () => {
    expect(toDraftOrder({ 'sleeper-a': 3, 'sleeper-b': 1 }, members, 'PREMIER')).toEqual({ 'ffu-001': 3, 'ffu-002': 1 })
  })
  it('throws on an unregistered account rather than writing a hole to disk', () => {
    expect(() => toDraftOrder({ 'sleeper-zz': 1 }, members, 'PREMIER')).toThrow(/sleeper-zz/)
  })
  it('is empty when the commissioner has not set an order', () => {
    expect(toDraftOrder(null, members, 'PREMIER')).toEqual({})
  })
})

describe('toPicks', () => {
  it('maps a pick to the shape the completed boards use', () => {
    const [p] = toPicks([pick(1, 'sleeper-a', '9221')], members, { 9221: { college: 'Alabama', age: 24 } }, 'PREMIER')
    expect(p).toEqual({
      overall: 1, round: 1, slot: 1, memberId: 'ffu-001',
      player: { id: '9221', name: 'Jah Gibbs', position: 'RB', nflTeam: 'DET', college: 'Alabama', age: 24 },
    })
  })

  it('attributes a traded pick to whoever actually made it, not the slot owner', () => {
    // draft_slot 1 belongs to A, but B picked — as with the backfilled data, picked_by wins.
    const [p] = toPicks([pick(1, 'sleeper-b', '1')], members, {}, 'PREMIER')
    expect(p.memberId).toBe('ffu-002')
  })

  it('omits college/age when the player directory has no entry', () => {
    const [p] = toPicks([pick(1, 'sleeper-a', 'DEF')], members, {}, 'PREMIER')
    expect(p.player).not.toHaveProperty('college')
    expect(p.player).not.toHaveProperty('age')
  })

  it('falls back to the player id when metadata carries no name', () => {
    const [p] = toPicks([pick(1, 'sleeper-a', 'BUF', { first_name: '', last_name: '' })], members, {}, 'PREMIER')
    expect(p.player.name).toBe('BUF')
  })

  it('sorts by overall pick regardless of the order Sleeper returns', () => {
    const picks = toPicks([pick(3, 'sleeper-a', 'c'), pick(1, 'sleeper-b', 'a'), pick(2, 'sleeper-a', 'b')], members, {}, 'PREMIER')
    expect(picks.map((p) => p.overall)).toEqual([1, 2, 3])
  })

  it('throws when a pick was made by an account missing from the registry', () => {
    expect(() => toPicks([pick(1, 'sleeper-zz', 'x')], members, {}, 'MASTERS')).toThrow(/MASTERS/)
  })
})

describe('toDraftData', () => {
  const base = {
    tier: 'PREMIER', year: '2026', schemaVersion: 1, members, players: {},
    picks: [pick(1, 'sleeper-a', '1')],
  }

  it('carries Sleeper\'s draft type through', () => {
    const draft = { draft_id: 'd1', type: 'snake', settings: { rounds: 15 }, draft_order: { 'sleeper-a': 1 } }
    expect(toDraftData({ ...base, draft })).toMatchObject({ draftId: 'd1', type: 'snake', rounds: 15 })
  })

  it('narrows an unrecognised type rather than writing it through', () => {
    const draft = { draft_id: 'd1', type: 'weird', settings: { rounds: 15 }, draft_order: {} }
    expect(toDraftData({ ...base, draft }).type).toBe('unknown')
  })
})
