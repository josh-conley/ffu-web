import type { SeasonData } from '@/data'
import { UPR_MIN_WEEKS, calculateUpr, seasonUpr } from './upr'
import premier2024 from '../../public/data/2024/premier.json'

describe('calculateUpr', () => {
  it('applies the formula ((avg×6)+((high+low)×2)+(winPct×400))/10 (verbatim)', () => {
    // winPct = 10/14 = 0.714285…; (130*6) + ((160+90)*2) + (0.714285*400) = 1565.714…; /10 → 156.57
    expect(calculateUpr({ wins: 10, losses: 4, ties: 0, average: 130, high: 160, low: 90 })).toBe(156.57)
  })

  it('handles a zero-game team (winPct 0)', () => {
    expect(calculateUpr({ wins: 0, losses: 0, ties: 0, average: 0, high: 0, low: 0 })).toBe(0)
  })

  it('counts ties as half a win', () => {
    // winPct = (0 + 1*0.5)/1 = 0.5; (100*6)+((100+100)*2)+(0.5*400) = 1200; /10 = 120
    expect(calculateUpr({ wins: 0, losses: 0, ties: 1, average: 100, high: 100, low: 100 })).toBe(120)
  })
})

describe('seasonUpr', () => {
  it('produces a UPR for every team in a season', () => {
    const season = premier2024 as unknown as SeasonData
    const upr = seasonUpr(season)
    expect(upr.size).toBe(season.teams.length)
    for (const value of upr.values()) expect(value).toBeGreaterThan(0)
  })

  // A rating built on a team's high and low says nothing until a few weeks exist to draw them from.
  const youngSeason = (weeks: number): SeasonData =>
    ({
      year: '2026',
      tier: 'PREMIER',
      era: 'sleeper',
      teams: [],
      games: Array.from({ length: weeks }, (_, i) => ({
        week: i + 1,
        isPlayoff: false,
        participants: [
          { memberId: 'a', score: 120 + i },
          { memberId: 'b', score: 90 + i },
        ],
      })),
    }) as unknown as SeasonData

  it(`withholds every rating until week ${UPR_MIN_WEEKS}`, () => {
    for (let weeks = 0; weeks < UPR_MIN_WEEKS; weeks++) {
      expect(seasonUpr(youngSeason(weeks)).size).toBe(0)
    }
  })

  it(`rates the season once ${UPR_MIN_WEEKS} weeks are in the book`, () => {
    const upr = seasonUpr(youngSeason(UPR_MIN_WEEKS))
    expect(upr.size).toBe(2)
    expect(upr.get('a')).toBeGreaterThan(upr.get('b')!)
  })
})
