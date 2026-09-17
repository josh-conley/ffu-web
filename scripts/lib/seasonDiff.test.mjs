import { describe, expect, it } from 'vitest'
import { diffSeason, lastWeekOf } from './seasonDiff.mjs'

const game = (week, a, aScore, b, bScore) => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: a, score: aScore },
    { memberId: b, score: bScore },
  ],
})
const fixture = (week, a, b) => ({ week, memberIds: [a, b] })
const schedule = [fixture(1, 'x', 'y'), fixture(2, 'x', 'z')]
const season = (games, fixtures = schedule) => ({ games, schedule: fixtures })

describe('diffSeason', () => {
  it('reports a newly completed week as added, and nothing else', () => {
    const before = season([game(1, 'x', 100, 'y', 90)])
    const after = season([game(1, 'x', 100, 'y', 90), game(2, 'x', 80, 'z', 85)])
    expect(diffSeason(before, after)).toEqual({ added: [game(2, 'x', 80, 'z', 85)], changed: [], removed: [], scheduleChanged: false })
  })

  it('is empty when nothing new has been played', () => {
    const games = [game(1, 'x', 100, 'y', 90)]
    expect(diffSeason(season(games), season(games))).toEqual({ added: [], changed: [], removed: [], scheduleChanged: false })
  })

  it('flags a completed score that changed', () => {
    const { changed } = diffSeason(season([game(1, 'x', 100, 'y', 90)]), season([game(1, 'x', 100, 'y', 91.5)]))
    expect(changed).toEqual([{ before: game(1, 'x', 100, 'y', 90), after: game(1, 'x', 100, 'y', 91.5) }])
  })

  it('matches a game regardless of the order its participants are listed in', () => {
    const { changed, added, removed } = diffSeason(season([game(1, 'x', 100, 'y', 90)]), season([game(1, 'y', 90, 'x', 100)]))
    expect({ changed, added, removed }).toEqual({ changed: [], added: [], removed: [] })
  })

  it('flags a completed game that disappeared', () => {
    const { removed } = diffSeason(season([game(1, 'x', 100, 'y', 90)]), season([]))
    expect(removed).toEqual([game(1, 'x', 100, 'y', 90)])
  })

  it('notices an edited schedule, but not a reordered one', () => {
    const games = []
    expect(diffSeason(season(games), season(games, [...schedule].reverse())).scheduleChanged).toBe(false)
    expect(diffSeason(season(games), season(games, [fixture(1, 'x', 'z'), fixture(2, 'x', 'y')])).scheduleChanged).toBe(true)
  })
})

describe('lastWeekOf', () => {
  it('is the newest completed week, or 0 before any', () => {
    expect(lastWeekOf(season([game(1, 'x', 1, 'y', 2), game(3, 'x', 1, 'z', 2)]))).toBe(3)
    expect(lastWeekOf(season([]))).toBe(0)
  })
})
