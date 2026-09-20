import type { SeasonData } from '@/data'
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
    expect(watch!.weeksHeld).toBeGreaterThanOrEqual(0)
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

  it('reports nothing when there is no lineage to build', () => {
    expect(beltWatch([], '2026', 1)).toBeNull()
  })
})
