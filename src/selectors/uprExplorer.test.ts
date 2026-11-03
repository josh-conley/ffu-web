import type { Game, SeasonData } from '@/data'
import { calculateUpr } from './upr'
import { liveUprStatus, longestRegularSeason, rankUprRows, uprThroughWeekRows, type UprWeekRow } from './uprExplorer'

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

describe('uprThroughWeekRows', () => {
  it('rates each team on weeks 1 through the given week only', () => {
    const rows = uprThroughWeekRows([season('2025', 14)], 4)
    const a = rows.find((r) => r.memberId === 'a')
    // Weeks 1–4: 101..104, all wins.
    expect(a?.totals.scores).toEqual([101, 102, 103, 104])
    expect(a?.upr).toBe(calculateUpr({ wins: 4, losses: 0, ties: 0, average: 102.5, high: 104, low: 101 }))
    expect(a?.live).toBe(false)
  })

  it('leaves playoff games out', () => {
    const rows = uprThroughWeekRows([season('2025', 14, 'sleeper', [game(15, 300, 0, true)])], 17)
    expect(rows.find((r) => r.memberId === 'a')?.totals.high).toBe(114)
  })

  it('rates nothing before UPR_MIN_WEEKS', () => {
    expect(uprThroughWeekRows([season('2025', 14)], 2)).toEqual([])
  })

  it('rates a finished 13-week season over its whole regular season through week 14', () => {
    const rows = uprThroughWeekRows([season('2019', 13, 'espn')], 14)
    expect(rows.find((r) => r.memberId === 'a')?.totals.scores).toHaveLength(13)
  })

  it('leaves out a season in progress until it has reached the week', () => {
    const live = season('2026', 8)
    expect(uprThroughWeekRows([live], 9)).toEqual([])
    expect(uprThroughWeekRows([live], 8).every((r) => r.live)).toBe(true)
  })
})

describe('rankUprRows', () => {
  const row = (key: string, upr: number) => ({ key, upr }) as UprWeekRow

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
  const statusAt = (s: SeasonData[], week: number) => liveUprStatus(s, rankUprRows(uprThroughWeekRows(s, week)), week)

  it('is undefined with no season in progress', () => {
    expect(statusAt([season('2025', 14)], 8)).toBeUndefined()
  })

  it("places the live season's first team in the ranked sample", () => {
    // The two seasons are identical through week 8, so 2026's `a` ties 2025's for first.
    expect(statusAt(seasons, 8)).toMatchObject({ kind: 'ranked', year: '2026', weeksPlayed: 8, outOf: 4, top: { memberId: 'a', rank: 1 } })
  })

  it('reports the live season as behind when the week is past the weeks it has played', () => {
    expect(statusAt(seasons, 14)).toEqual({ kind: 'behind', year: '2026', weeksPlayed: 8, canRank: true })
  })

  it('cannot rank a live season that has fewer weeks than a UPR needs', () => {
    expect(statusAt([season('2026', 2)], 14)).toMatchObject({ kind: 'behind', canRank: false })
  })
})

describe('longestRegularSeason', () => {
  it('is the longest regular season of any era present', () => {
    expect(longestRegularSeason([season('2019', 13, 'espn')])).toBe(13)
    expect(longestRegularSeason([season('2019', 13, 'espn'), season('2025', 14)])).toBe(14)
  })
})
