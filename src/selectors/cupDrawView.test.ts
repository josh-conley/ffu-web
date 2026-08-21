import { drawCup } from '@/lib/cupDraw.mjs'
import type { CupField } from '@/lib/cupDraw.mjs'
import { bowlAfter, eligibleForSpin, tierIndex } from './cupDrawView'

const mk = (prefix: string) => Array.from({ length: 12 }, (_, i) => ({ ffuId: `${prefix}-${i + 1}`, name: `${prefix} ${i + 1}` }))
const field: CupField = { PREMIER: mk('p'), MASTERS: mk('m'), NATIONAL: mk('n') }
const result = drawCup(field, 'view-test')

describe('tierIndex', () => {
  it('maps every team in the field to its league', () => {
    const idx = tierIndex(field)
    expect(idx.size).toBe(36)
    expect(idx.get('p-1')).toBe('PREMIER')
    expect(idx.get('n-12')).toBe('NATIONAL')
  })
})

describe('bowlAfter', () => {
  it('starts with all 24 drawable teams and nothing closed', () => {
    const bowl = bowlAfter(field, result, 0)
    expect(bowl.mastersBowl).toHaveLength(12)
    expect(bowl.nationalBowl).toHaveLength(12)
    expect(bowl.mastersClosed).toBe(false)
    expect(bowl.nationalClosed).toBe(false)
  })

  it('removes each team as it is drawn', () => {
    const bowl = bowlAfter(field, result, 5)
    expect(bowl.mastersBowl.length + bowl.nationalBowl.length).toBe(24 - 5)
    for (const drawn of result.drawnOrder.slice(0, 5)) {
      expect([...bowl.mastersBowl, ...bowl.nationalBowl].map((t) => t.ffuId)).not.toContain(drawn.ffuId)
    }
  })

  it('closes a league exactly when it has given up its sixth team', () => {
    const tierOf = tierIndex(field)
    const count = (n: number, tier: string) =>
      result.drawnOrder.slice(0, n).filter((t) => tierOf.get(t.ffuId) === tier).length

    for (let revealed = 0; revealed < 12; revealed++) {
      const bowl = bowlAfter(field, result, revealed)
      expect(bowl.mastersClosed).toBe(count(revealed, 'MASTERS') === 6)
      expect(bowl.nationalClosed).toBe(count(revealed, 'NATIONAL') === 6)
    }
  })

  it('empties the Masters half once Premier is done — those teams become drawers', () => {
    const bowl = bowlAfter(field, result, 12)
    expect(bowl.mastersBowl).toEqual([])
    expect(bowl.nationalBowl).toHaveLength(6)
    // The closed stamps belong to Premier's phase only; phase two has nothing to close.
    expect(bowl.mastersClosed).toBe(false)
    expect(bowl.nationalClosed).toBe(false)
  })

  it('is empty once every tie is drawn', () => {
    const bowl = bowlAfter(field, result, 18)
    expect(bowl.mastersBowl).toEqual([])
    expect(bowl.nationalBowl).toEqual([])
  })
})

describe('eligibleForSpin', () => {
  it('never offers a crest the rules have ruled out', () => {
    for (let revealed = 0; revealed < 18; revealed++) {
      const bowl = bowlAfter(field, result, revealed)
      const eligible = eligibleForSpin(bowl)
      // Whatever the spinner may flash, the team actually drawn next must be among it.
      const actual = result.drawnOrder[revealed]
      expect(eligible.map((t) => t.ffuId), `tie ${revealed + 1}`).toContain(actual!.ffuId)
      if (bowl.mastersClosed) expect(eligible.every((t) => t.tier === 'NATIONAL')).toBe(true)
      if (bowl.nationalClosed) expect(eligible.every((t) => t.tier === 'MASTERS')).toBe(true)
    }
  })
})
