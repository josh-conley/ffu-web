import type { DraftData } from '@/data'
import type { Tier } from '@/config/types'
import { biggestReaches, biggestValues, deltaFor, marketPositions, pickComparisons, pickIn, playerMarkets } from './draftMarket'

const player = (id: string, position = 'RB') => ({ id, name: `Player ${id}`, position })
const draft = (tier: Tier, picks: [string, number, string?][]): DraftData => ({
  schemaVersion: 1,
  tier,
  year: '2026',
  draftId: `d-${tier}`,
  type: 'snake',
  rounds: 15,
  draftOrder: {},
  picks: picks.map(([playerId, overall, pos]) => ({
    overall,
    round: Math.ceil(overall / 12),
    slot: ((overall - 1) % 12) + 1,
    memberId: `m-${tier}-${overall}`,
    player: player(playerId, pos),
  })),
})

// 'star' goes early everywhere. 'split' is a 20 in one league, 100 in the others — the disagreement
// the page exists to surface. 'solo' is taken by one league only.
const drafts = [
  draft('PREMIER', [['star', 1], ['split', 100], ['solo', 50]]),
  draft('MASTERS', [['star', 2], ['split', 20]]),
  draft('NATIONAL', [['star', 6], ['split', 100]]),
]

describe('playerMarkets', () => {
  const markets = playerMarkets(drafts)
  const find = (id: string) => markets.find((m) => m.player.id === id)!

  it('collects every league that drafted a player, in pick order', () => {
    expect(find('star').picks.map((p) => [p.tier, p.overall])).toEqual([['PREMIER', 1], ['MASTERS', 2], ['NATIONAL', 6]])
  })

  it('averages the picks into an FFU ADP', () => {
    expect(find('star').ffuAdp).toBe(3) // (1 + 2 + 6) / 3
    expect(find('star').earliest).toBe(1)
    expect(find('star').latest).toBe(6)
  })

  it('keeps a player only one league drafted', () => {
    expect(find('solo').picks).toHaveLength(1)
    expect(find('solo').ffuAdp).toBe(50)
  })

  it('finds a player\'s pick in one tier', () => {
    expect(pickIn(find('star'), 'MASTERS')?.overall).toBe(2)
    expect(pickIn(find('solo'), 'MASTERS')).toBeUndefined()
  })
})

describe('pickComparisons', () => {
  const comparisons = pickComparisons(playerMarkets(drafts))

  it('measures a pick against the OTHER leagues, never against itself', () => {
    // Masters took 'split' at 20; the other two both took him at 100, so the field is 100 — not the
    // 73.3 you would get by averaging all three. Excluding the pick is what keeps the gap honest.
    const masters = comparisons.find((c) => c.player.id === 'split' && c.tier === 'MASTERS')!
    expect(masters.fieldAdp).toBe(100)
    expect(masters.delta).toBe(80)
  })

  it('reports a pick behind the field as a negative delta', () => {
    const premier = comparisons.find((c) => c.player.id === 'split' && c.tier === 'PREMIER')!
    expect(premier.fieldAdp).toBe(60) // (20 + 100) / 2
    expect(premier.delta).toBe(-40)
  })

  it('leaves out a player nobody else drafted, rather than calling it a delta of zero', () => {
    // A zero would read as "exactly on ADP" when it actually means there is no field to compare to.
    expect(comparisons.some((c) => c.player.id === 'solo')).toBe(false)
  })
})

describe('reaches and values', () => {
  const comparisons = pickComparisons(playerMarkets(drafts))

  it('ranks the biggest reach first', () => {
    const [top] = biggestReaches(comparisons, 3)
    expect([top!.player.id, top!.tier, top!.delta]).toEqual(['split', 'MASTERS', 80])
  })

  it('ranks the biggest value first', () => {
    const [top] = biggestValues(comparisons, 3)
    expect(top!.delta).toBeLessThan(0)
    expect(top!.player.id).toBe('split')
  })

  it('honours the limit', () => {
    expect(biggestReaches(comparisons, 2)).toHaveLength(2)
  })
})

describe('marketPositions', () => {
  it('orders positions QB→DEF, then anything else alphabetically', () => {
    const mixed = [draft('PREMIER', [['a', 1, 'WR'], ['b', 2, 'QB'], ['c', 3, 'DEF'], ['d', 4, 'LB']])]
    expect(marketPositions(playerMarkets(mixed))).toEqual(['QB', 'WR', 'DEF', 'LB'])
  })
})

describe('the Sleeper ADP baseline', () => {
  // 'split' is a 20 in Masters and a 100 in the other two; the wider market has him at 90.
  const adp = { split: 90, star: 3 }
  const comparisons = pickComparisons(playerMarkets(drafts), adp)
  const find = (id: string, tier: Tier) => comparisons.find((c) => c.player.id === id && c.tier === tier)!

  it('carries both baselines on the same pick, so they can disagree', () => {
    const masters = find('split', 'MASTERS')
    expect(masters.fieldAdp).toBe(100) // the other two FFU leagues
    expect(masters.delta).toBe(80)
    expect(masters.adp).toBe(90) // the wider market
    expect(masters.adpDelta).toBe(70)
  })

  it('leaves the ADP fields off a player the snapshot does not cover', () => {
    const withoutAdp = pickComparisons(playerMarkets(drafts), {})
    expect(withoutAdp[0]).not.toHaveProperty('adp')
    expect(deltaFor(withoutAdp[0]!, 'sleeper')).toBeUndefined()
  })

  it('ranks reaches by whichever baseline is asked for', () => {
    expect(biggestReaches(comparisons, 1, 'ffu')[0]!.delta).toBe(80)
    expect(biggestReaches(comparisons, 1, 'sleeper')[0]!.adpDelta).toBe(70)
  })

  it('omits picks with no ADP from a Sleeper-baseline ranking rather than treating them as zero', () => {
    const partial = pickComparisons(playerMarkets(drafts), { star: 3 })
    expect(biggestReaches(partial, 10, 'sleeper').every((c) => c.player.id === 'star')).toBe(true)
  })
})
