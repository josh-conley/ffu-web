import type { Game, SeasonData } from '@/data'
import type { Tier } from '@/config'
import { tieStory } from './tieStory'

// Two teams, a handful of seasons, so the counts and the "last meeting" are checkable by eye.
const game = (week: number, a: number, b: number, isPlayoff = false): Game => ({
  week,
  isPlayoff,
  participants: [
    { memberId: 'a', score: a },
    { memberId: 'b', score: b },
  ],
})

const season = (year: string, tier: Tier, games: Game[]): SeasonData => ({
  schemaVersion: 1,
  tier,
  year,
  era: 'sleeper',
  platformLeagueId: 'x',
  teams: [],
  games,
})

describe('tieStory', () => {
  it('counts the series from the drawing side, newest meeting last', () => {
    const seasons = [
      season('2023', 'PREMIER', [game(3, 100, 90), game(9, 80, 120)]),
      season('2024', 'PREMIER', [game(5, 110, 100)]),
    ]
    const story = tieStory(seasons, 'a', 'b')
    expect(story.meetings).toBe(3)
    expect(story.aWins).toBe(2)
    expect(story.bWins).toBe(1)
    expect(story.last).toMatchObject({ year: '2024', week: 5 })
  })

  it('flags a playoff rematch only when the LAST meeting was a playoff game', () => {
    const playoffLast = [season('2024', 'PREMIER', [game(5, 100, 90), game(15, 100, 90, true)])]
    expect(tieStory(playoffLast, 'a', 'b').playoffRematch).toBe(true)

    const regularLast = [season('2024', 'PREMIER', [game(15, 100, 90, true), game(16, 100, 90)])]
    expect(tieStory(regularLast, 'a', 'b').playoffRematch).toBe(false)
  })

  it('reports no meetings for two teams who have never played', () => {
    const seasons = [season('2024', 'PREMIER', [game(1, 100, 90)])]
    const story = tieStory(seasons, 'a', 'never-played')
    expect(story.meetings).toBe(0)
    expect(story.last).toBeUndefined()
    expect(story.playoffRematch).toBe(false)
  })

  it('counts ties as meetings without crediting either side a win', () => {
    const seasons = [season('2024', 'PREMIER', [game(1, 100, 100)])]
    const story = tieStory(seasons, 'a', 'b')
    expect(story).toMatchObject({ meetings: 1, aWins: 0, bWins: 0, ties: 1 })
  })
})
