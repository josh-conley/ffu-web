import type { Game, LiveSeasonData, NflState } from '@/data'
import { currentWeekMatchups, gameForFixture, homeLiveSection, liveScoredWeeks, liveWeekFor, seasonHasStarted, standingsThroughPreviousWeek } from './liveWeek'

const game = (week: number, aId: string, aScore: number, bId: string, bScore: number): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: aId, score: aScore },
    { memberId: bId, score: bScore },
  ],
})

// a beats b every completed week (1-4); week 5 (the "current" week) is in progress.
const data: LiveSeasonData = {
  tier: 'PREMIER',
  year: '2025',
  leagueId: 'lg1',
  currentWeek: 5,
  memberIds: ['a', 'b', 'c'],
  games: [
    game(1, 'a', 120, 'b', 100),
    game(2, 'a', 110, 'b', 90),
    game(3, 'a', 130, 'b', 95),
    game(4, 'a', 100, 'b', 105),
    game(5, 'a', 40, 'b', 35), // partial live score for the current week
  ],
}

describe('currentWeekMatchups', () => {
  it('returns only the current week\'s games', () => {
    const games = currentWeekMatchups(data)
    expect(games).toHaveLength(1)
    expect(games[0]?.week).toBe(5)
  })
})

describe('standingsThroughPreviousWeek', () => {
  it('excludes the in-progress current week entirely', () => {
    const rows = standingsThroughPreviousWeek(data)
    const a = rows.find((r) => r.totals.memberId === 'a')
    expect(a?.totals.wins).toBe(3)
    expect(a?.totals.losses).toBe(1) // week 4 loss; week 5's score never counted
  })

  it('gives an all-zero row to a member with no completed games', () => {
    const rows = standingsThroughPreviousWeek(data)
    const c = rows.find((r) => r.totals.memberId === 'c')
    expect(c?.totals).toMatchObject({ wins: 0, losses: 0, ties: 0, pointsFor: 0 })
  })

  it('ranks by winPct, then pointsFor, sharing ranks on an exact tie', () => {
    const rows = standingsThroughPreviousWeek(data)
    const a = rows.find((r) => r.totals.memberId === 'a')
    const b = rows.find((r) => r.totals.memberId === 'b')
    const c = rows.find((r) => r.totals.memberId === 'c')
    expect(a?.rank).toBe(1)
    expect(b?.rank).toBe(2)
    expect(c?.rank).toBe(3)
  })
})

describe('liveWeekFor', () => {
  const state = (over: Partial<NflState> = {}): NflState => ({ week: 3, seasonType: 'regular', year: '2026', seasonStartDate: '2026-09-09', ...over })
  const during = new Date(2026, 8, 24).getTime() // well after kickoff

  it('is the current week for the season being played', () => {
    expect(liveWeekFor('2026', state(), during)).toBe(3)
  })

  it('is undefined for any other season, so an archive year never claims a live week', () => {
    expect(liveWeekFor('2025', state(), during)).toBeUndefined()
  })

  it('is undefined before kickoff, when week 1 is still merely upcoming', () => {
    expect(liveWeekFor('2026', state({ week: 1 }), new Date(2026, 8, 1).getTime())).toBeUndefined()
  })

  it('is undefined outside the regular season', () => {
    expect(liveWeekFor('2026', state({ seasonType: 'post' }), during)).toBeUndefined()
    expect(liveWeekFor('2026', state({ seasonType: 'pre' }), during)).toBeUndefined()
  })

  it('is undefined with no state at all (the fetch failed or is still in flight)', () => {
    expect(liveWeekFor('2026', undefined, during)).toBeUndefined()
  })
})

describe('seasonHasStarted', () => {
  const state = (seasonStartDate: string): NflState => ({ week: 1, seasonType: 'regular', year: '2026', seasonStartDate })
  const at = (iso: string) => new Date(iso).getTime()

  it('is false while Sleeper says regular season but week 1 is still days away', () => {
    // The case this exists for: on 2026-08-30 Sleeper already reported season_type "regular",
    // week 1 — ten days before kickoff — which put an all-zeroes preview on the home page.
    expect(seasonHasStarted(state('2026-09-09'), at('2026-08-30T21:00:00'))).toBe(false)
  })

  it('is true from the start date onward', () => {
    expect(seasonHasStarted(state('2026-09-09'), at('2026-09-09T00:00:00'))).toBe(true)
    expect(seasonHasStarted(state('2026-09-09'), at('2026-10-01T12:00:00'))).toBe(true)
  })

  it('fails open when Sleeper sends no start date', () => {
    expect(seasonHasStarted(state(''), at('2026-08-30T21:00:00'))).toBe(true)
  })
})

describe('homeLiveSection', () => {
  // Sleeper rolls its week over on Tuesday morning, so Tuesday→Thursday "this week" is all 0.00
  // while the standings have just been settled by Monday night.
  const on = (iso: string) => homeLiveSection(new Date(iso))

  it('leads with the standings on a Tuesday', () => {
    expect(on('2026-09-15T09:00:00')).toBe('standings')
    expect(on('2026-11-17T23:30:00')).toBe('standings')
  })

  it('leads with the matchups every other day', () => {
    expect(on('2026-09-13T13:00:00')).toBe('matchups') // Sunday, games running
    expect(on('2026-09-14T20:00:00')).toBe('matchups') // Monday night
    expect(on('2026-09-16T09:00:00')).toBe('matchups') // Wednesday
    expect(on('2026-09-17T20:00:00')).toBe('matchups') // Thursday kickoff
  })

  it('reads the local day, so it is Tuesday where the reader is', () => {
    // Late Monday local is still Monday, not yet the standings day.
    expect(on('2026-09-14T23:59:00')).toBe('matchups')
    expect(on('2026-09-15T00:01:00')).toBe('standings')
  })
})

describe('liveScoredWeeks', () => {
  const unplayed = [{ week: 2 }, { week: 3 }, { week: 4 }]
  it('takes the unplayed weeks up to and including the live one', () => {
    expect(liveScoredWeeks(unplayed, 3)).toEqual([2, 3])
    expect(liveScoredWeeks(unplayed.slice(1), 3)).toEqual([3])
  })
  it('is empty when no week is live', () => {
    expect(liveScoredWeeks(unplayed, undefined)).toEqual([])
  })
})

describe('gameForFixture', () => {
  const games = [game(3, 'a', 40, 'b', 35), game(3, 'c', 10, 'd', 12), game(4, 'b', 0, 'a', 0)]
  it('finds the game by week and both members, in either order', () => {
    expect(gameForFixture({ week: 3, memberIds: ['b', 'a'] }, games)).toBe(games[0])
    expect(gameForFixture({ week: 4, memberIds: ['a', 'b'] }, games)).toBe(games[2])
  })
  it('is undefined when Sleeper has no such game', () => {
    expect(gameForFixture({ week: 3, memberIds: ['a', 'c'] }, games)).toBeUndefined()
    expect(gameForFixture({ week: 5, memberIds: ['a', 'b'] }, games)).toBeUndefined()
  })
})
