import { knockoutOrder, knockoutTimes } from './drawKnockout'

const pool = Array.from({ length: 24 }, (_, i) => `t-${i + 1}`)

describe('knockoutOrder', () => {
  it('knocks out everyone except the drawn team, exactly once each', () => {
    const order = knockoutOrder(pool, 't-7', 'seed', 0)
    expect(order).not.toContain('t-7')
    expect([...order].sort()).toEqual(pool.filter((t) => t !== 't-7').sort())
  })

  it('replays the same order from the same seed and matchup, and differs across matchups', () => {
    expect(knockoutOrder(pool, 't-7', 'seed', 0)).toEqual(knockoutOrder(pool, 't-7', 'seed', 0))
    expect(knockoutOrder(pool, 't-7', 'seed', 1)).not.toEqual(knockoutOrder(pool, 't-7', 'seed', 0))
  })
})

describe('knockoutTimes', () => {
  it('has one step per knockout and slows down for the last few', () => {
    const times = knockoutTimes(24)
    expect(times).toHaveLength(23)
    const gaps = times.map((t, i) => t - (times[i - 1] ?? 0))
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]!).toBeGreaterThanOrEqual(gaps[i - 1]!)
    expect(gaps.at(-1)!).toBeGreaterThan(gaps[0]! * 5)
  })

  it('keeps a full 24-team reveal around ten seconds, and a 6-team one around five', () => {
    expect(knockoutTimes(24).at(-1)!).toBeGreaterThan(8000)
    expect(knockoutTimes(24).at(-1)!).toBeLessThan(13000)
    expect(knockoutTimes(6).at(-1)!).toBeGreaterThan(4000)
  })

  it('has nothing to do for a pool of one', () => {
    expect(knockoutTimes(1)).toEqual([])
  })
})
