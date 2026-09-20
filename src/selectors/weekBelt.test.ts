import type { SeasonData } from '@/data'
import { linealHistory } from './lineal'
import { beltWatch } from './weekBelt'
import premier2018 from '../../public/data/2018/premier.json'
import premier2019 from '../../public/data/2019/premier.json'

const seasons = [premier2018, premier2019] as unknown as SeasonData[]

describe('beltWatch', () => {
  it('reports the current holder and their reign', () => {
    const watch = beltWatch(seasons, '2019', 1)
    expect(watch).not.toBeNull()
    expect(watch!.holderId).toMatch(/^ffu-/)
    expect(watch!.defenses).toBeGreaterThanOrEqual(0)
    expect(watch!.weeksHeld).toBeGreaterThanOrEqual(1)
  })

  it('carries the title game of the week asked about', () => {
    // Week 1 of 2019 is a title game: the belt holder played someone.
    const watch = beltWatch(seasons, '2019', 1)
    expect(watch!.bout).toBeDefined()
    expect(watch!.bout!.week).toBe(1)
    expect(['defended', 'drawn', 'lost']).toContain(watch!.bout!.outcome)
  })

  it('has no bout for a week the holder did not play', () => {
    expect(beltWatch(seasons, '2019', 99)?.bout).toBeUndefined()
  })

  it('ends the chain of custody with the current holder', () => {
    const watch = beltWatch(seasons, '2019', 1)!
    expect(watch.chain.length).toBeGreaterThan(0)
    expect(watch.chain.length).toBeLessThanOrEqual(5)
    expect(watch.chain.at(-1)!.championId).toBe(watch.holderId)
    expect(watch.chain.at(-1)!.current).toBe(true)
    // Oldest first, and each link carries the score that won it.
    expect(watch.chain.map((r) => r.order)).toEqual([...watch.chain.map((r) => r.order)].sort((a, b) => a - b))
    expect(watch.chain.at(-1)!.wonBout.score).toBeGreaterThan(0)
  })

  it('links each holder to the one it took the belt from', () => {
    const watch = beltWatch(seasons, '2019', 1)!
    for (const [i, reign] of watch.chain.entries()) {
      if (i === 0) continue
      expect(reign.wonFrom).toBe(watch.chain[i - 1]!.championId)
    }
  })

  it('flags a lineage longer than the chain it shows', () => {
    const watch = beltWatch(seasons, '2019', 1)!
    const total = linealHistory(seasons).reigns.length
    expect(watch.truncated).toBe(total > watch.chain.length)
  })

  it('reports nothing when there is no lineage to build', () => {
    expect(beltWatch([], '2026', 1)).toBeNull()
  })
})
