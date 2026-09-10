import type { Game, LiveSeasonData, NflState } from '@/data'
import { currentWeekMatchups, homeLiveSection, seasonHasStarted, standingsThroughPreviousWeek } from './liveWeek'

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
