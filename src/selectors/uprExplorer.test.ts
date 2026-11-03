import type { Game, SeasonData } from '@/data'
import { calculateUpr } from './upr'
import { liveUprStatus, longestRegularSeason, rankUprRows, uprWindowRows, type UprWindowRow } from './uprExplorer'

const game = (week: number, a: number, b: number, isPlayoff = false): Game =>
  ({ week, isPlayoff, participants: [{ memberId: 'a', score: a }, { memberId: 'b', score: b }] }) as Game

/** `a` scores 100 + week and beats `b` (90) every week, for `weeks` weeks. */
const season = (year: string, weeks: number, era: 'espn' | 'sleeper' = 'sleeper', extra: Game[] = []): SeasonData =>
  ({
    year,
    tier: 'PREMIER',
    era,
    teams: [],
    games: [...Array.from({ length: weeks }, (_, i) => game(i + 1, 101 + i, 90)), ...extra],
  }) as unknown as SeasonData

describe('uprWindowRows', () => {
  it('rates each team over only the weeks in the window', () => {
    const rows = uprWindowRows([season('2025', 14)], { from: 3, to: 5 })
    const a = rows.find((r) => r.memberId === 'a')
    // Weeks 3–5: 103, 104, 105, all wins.
    expect(a?.totals.scores).toEqual([103, 104, 105])
    expect(a?.upr).toBe(calculateUpr({ wins: 3, losses: 0, ties: 0, average: 104, high: 105, low: 103 }))
    expect(a?.live).toBe(false)
  })

  it('leaves playoff games out', () => {
    const rows = uprWindowRows([season('2025', 14, 'sleeper', [game(15, 300, 0, true)])], { from: 1, to: 17 })
    expect(rows.find((r) => r.memberId === 'a')?.totals.high).toBe(114)
  })

  it('rates nothing over a span shorter than UPR_MIN_WEEKS', () => {
    expect(uprWindowRows([season('2025', 14)], { from: 1, to: 2 })).toEqual([])
  })

  it('rates a finished 13-week season over its whole regular season when the window runs to 14', () => {
    const rows = uprWindowRows([season('2019', 13, 'espn')], { from: 1, to: 14 })
    expect(rows.find((r) => r.memberId === 'a')?.totals.scores).toHaveLength(13)
  })

  it('leaves out a season in progress until it has played through the window', () => {
    const live = season('2026', 8)
    expect(uprWindowRows([live], { from: 1, to: 9 })).toEqual([])
    expect(uprWindowRows([live], { from: 1, to: 8 }).every((r) => r.live)).toBe(true)
  })
})

describe('rankUprRows', () => {
  const row = (key: string, upr: number) => ({ key, upr }) as UprWindowRow

  it('ranks highest first, with equal ratings sharing a rank', () => {
    const ranked = rankUprRows([row('x', 100), row('y', 120), row('z', 100)])
    expect(ranked.map((r) => [r.key, r.rank])).toEqual([['y', 1], ['x', 2], ['z', 2]])
  })

  it('ranks lowest first when asked', () => {
    expect(rankUprRows([row('x', 100), row('y', 120)], true).map((r) => r.key)).toEqual(['x', 'y'])
  })
})

describe('liveUprStatus', () => {
  const seasons = [season('2025', 14), season('2026', 8)]

  it('is undefined with no season in progress', () => {
    const done = [season('2025', 14)]
    expect(liveUprStatus(done, rankUprRows(uprWindowRows(done, { from: 1, to: 8 })), { from: 1, to: 8 })).toBeUndefined()
  })

  it("places the live season's first team in the ranked sample", () => {
    const window = { from: 1, to: 8 }
    const status = liveUprStatus(seasons, rankUprRows(uprWindowRows(seasons, window)), window)
    // The two seasons are identical through week 8, so 2026's `a` ties 2025's for first.
    expect(status).toMatchObject({ kind: 'ranked', year: '2026', weeksPlayed: 8, outOf: 4, top: { memberId: 'a', rank: 1 } })
  })

  it('reports the live season as behind when the window runs past the weeks it has played', () => {
    const window = { from: 1, to: 14 }
    expect(liveUprStatus(seasons, rankUprRows(uprWindowRows(seasons, window)), window)).toEqual({
      kind: 'behind',
      year: '2026',
      weeksPlayed: 8,
      catchUp: { from: 1, to: 8 },
    })
  })

  it('offers a catch-up window that still spans UPR_MIN_WEEKS, or none while too young', () => {
    const late = { from: 8, to: 14 }
    expect(liveUprStatus(seasons, [], late)).toMatchObject({ catchUp: { from: 6, to: 8 } })
    const young = [season('2026', 2)]
    expect(liveUprStatus(young, [], { from: 1, to: 14 })).toMatchObject({ kind: 'behind', catchUp: undefined })
  })

  it('is undefined when the window is rated but too short for any UPR', () => {
    expect(liveUprStatus(seasons, [], { from: 1, to: 2 })).toBeUndefined()
  })
})

describe('longestRegularSeason', () => {
  it('is the longest regular season of any era present', () => {
    expect(longestRegularSeason([season('2019', 13, 'espn')])).toBe(13)
    expect(longestRegularSeason([season('2019', 13, 'espn'), season('2025', 14)])).toBe(14)
  })
})
