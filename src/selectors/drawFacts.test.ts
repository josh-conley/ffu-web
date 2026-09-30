import type { SeasonData, SeasonTeam } from '@/data'
import type { Tier } from '@/config'
import { drawFacts } from './drawFacts'

const team = (memberId: string, wins: number, extra: Partial<SeasonTeam> = {}): SeasonTeam => ({
  memberId,
  record: { wins, losses: 4 - wins, ties: 0 },
  points: { for: 100 + wins, against: 100 },
  promoted: false,
  relegated: false,
  ...extra,
})

const season = (year: string, tier: Tier, teams: SeasonTeam[]): SeasonData => ({
  schemaVersion: 1,
  tier,
  year,
  era: 'sleeper',
  platformLeagueId: 'x',
  teams,
  games: [],
})

describe('drawFacts', () => {
  const seasons = [
    season('2024', 'MASTERS', [team('a', 3, { finalPlacement: 1 }), team('b', 1, { finalPlacement: 2 })]),
    season('2025', 'MASTERS', [team('a', 4, { finalPlacement: 1, promoted: true }), team('b', 0, { finalPlacement: 2 })]),
    season('2026', 'PREMIER', [team('x', 4), team('a', 3), team('y', 1)]),
  ]

  it('reads this season so far, last season and titles', () => {
    expect(drawFacts(seasons, 'a', '2026')).toEqual({
      thisSeason: { tier: 'PREMIER', record: { wins: 3, losses: 1, ties: 0 }, rank: 2, size: 3 },
      lastSeason: { year: '2025', tier: 'MASTERS', place: 1, size: 2, move: 'promoted' },
      titles: 2,
      seasons: 3,
    })
  })

  it('leaves out what a team did not play', () => {
    const facts = drawFacts(seasons, 'x', '2026')
    expect(facts.lastSeason).toBeUndefined()
    expect(facts.titles).toBe(0)
    expect(facts.seasons).toBe(1)
  })
})
