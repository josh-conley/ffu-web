import { drawCup, makeRng } from './cupDraw.mjs'

// The draw decides a competition that pays out, so these tests are about two things: it is
// REPRODUCIBLE from its seed, and it always satisfies the rules the amendment guarantees.

const field = (() => {
  const mk = (prefix) => Array.from({ length: 12 }, (_, i) => ({ ffuId: `${prefix}-${i + 1}`, name: `${prefix} ${i + 1}` }))
  return { PREMIER: mk('p'), MASTERS: mk('m'), NATIONAL: mk('n') }
})()

const tierOf = (ffuId) => ({ p: 'PREMIER', m: 'MASTERS', n: 'NATIONAL' })[ffuId[0]]
const seeds = ['1', '47', 'week1-mnf-51', '999999', 'abc']

describe('makeRng', () => {
  it('is deterministic per seed and differs between seeds', () => {
    const take = (s) => Array.from({ length: 5 }, makeRng(s))
    expect(take('47')).toEqual(take('47'))
    expect(take('47')).not.toEqual(take('48'))
  })

  it('stays inside [0, 1)', () => {
    const rng = makeRng('x')
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('drawCup', () => {
  it('is reproducible: the same seed always yields the same bracket', () => {
    expect(drawCup(field, '47')).toEqual(drawCup(field, '47'))
  })

  it('produces a different bracket for a different seed', () => {
    expect(drawCup(field, '47').matchups).not.toEqual(drawCup(field, '48').matchups)
  })

  it.each(seeds)('opens 6/6/6 cross-league with every team drawn exactly once (seed %s)', (seed) => {
    const { matchups } = drawCup(field, seed)
    expect(matchups).toHaveLength(18)

    const shape = (m) => [tierOf(m.a), tierOf(m.b)].sort().join('-')
    const counts = matchups.reduce((acc, m) => ({ ...acc, [shape(m)]: (acc[shape(m)] ?? 0) + 1 }), {})
    expect(counts).toEqual({ 'MASTERS-PREMIER': 6, 'NATIONAL-PREMIER': 6, 'MASTERS-NATIONAL': 6 })

    const played = matchups.flatMap((m) => [m.a, m.b])
    expect(new Set(played).size).toBe(36)
  })

  it.each(seeds)('seeds the drawing teams by draft order and the drawn teams in reverse (seed %s)', (seed) => {
    const { participants, drawnOrder, matchups } = drawCup(field, seed)
    const seedOf = new Map(participants.map((p) => [p.ffuId, p.seed]))

    // Premier keeps its draft order as seeds 1–12.
    field.PREMIER.forEach((t, i) => expect(seedOf.get(t.ffuId)).toBe(i + 1))

    // The six Masters teams that drew (i.e. were never drawn) take 13–18, in draft order.
    const drawnIds = new Set(drawnOrder.map((t) => t.ffuId))
    const drawingMasters = field.MASTERS.filter((t) => !drawnIds.has(t.ffuId))
    expect(drawingMasters).toHaveLength(6)
    drawingMasters.forEach((t, i) => expect(seedOf.get(t.ffuId)).toBe(13 + i))

    // Every drawn team is seeded backwards from 36 in the order it came out.
    expect(drawnOrder).toHaveLength(18)
    drawnOrder.forEach((t, i) => expect(seedOf.get(t.ffuId)).toBe(36 - i))

    // Seeds 1–36 are each used once.
    expect(participants.map((p) => p.seed)).toEqual(Array.from({ length: 36 }, (_, i) => i + 1))
    // ...and every drawing team faces someone it drew.
    expect(matchups.every((m) => seedOf.get(m.a) <= 18)).toBe(true)
  })

  it('refuses a malformed field rather than emitting a broken bracket', () => {
    expect(() => drawCup({ ...field, PREMIER: field.PREMIER.slice(0, 11) }, '1')).toThrow(/exactly 12 teams/)
    const dupe = { ...field, NATIONAL: [...field.NATIONAL.slice(0, 11), field.MASTERS[0]] }
    expect(() => drawCup(dupe, '1')).toThrow(/more than one league/)
  })

  it('draws from the 24 as one pool, so Premier is not biased toward either league', () => {
    // Premier's first pick should come up Masters roughly half the time. A "pick a league, then a
    // team" implementation would pass the 6/6 checks above but fail this.
    let masters = 0
    const runs = 400
    for (let i = 0; i < runs; i++) {
      const { matchups } = drawCup(field, `bias-${i}`)
      if (tierOf(matchups[0].b) === 'MASTERS') masters++
    }
    expect(masters / runs).toBeGreaterThan(0.4)
    expect(masters / runs).toBeLessThan(0.6)
  })
})
