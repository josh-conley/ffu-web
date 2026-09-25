import { fetchNflWeekGames, fetchWeekProjections, gameClock } from './liveNfl'

describe('gameClock', () => {
  it('maps finished and canceled games to final with nothing remaining', () => {
    expect(gameClock({ status: 'complete' })).toMatchObject({ status: 'final', remaining: 0 })
    expect(gameClock({ status: 'canceled' })).toMatchObject({ status: 'final', remaining: 0 })
    expect(gameClock({ metadata: { is_over: true } })).toMatchObject({ status: 'final', remaining: 0 })
  })

  it('maps a game not yet started to pre with all of it remaining', () => {
    expect(gameClock({ status: 'pre_game', metadata: { quarter_num: '' } })).toMatchObject({ status: 'pre', remaining: 1 })
  })

  it('prorates a live game by quarter and clock', () => {
    // Q3 with 7:30 left: one full quarter + half of this one = 1.5 of 4 quarters.
    expect(gameClock({ status: 'in_game', metadata: { quarter_num: 3, time_remaining: '07:30' } })).toMatchObject({ status: 'live', remaining: 1.5 / 4, quarter: 3, clock: '07:30' })
    // Halftime reads as end of Q2.
    expect(gameClock({ metadata: { is_in_progress: true, quarter_num: '2', time_remaining: '00:00' } }).remaining).toBe(0.5)
  })

  it('counts overtime as no regulation left, and an unreported quarter as just kicked off', () => {
    expect(gameClock({ status: 'in_game', metadata: { quarter_num: 5, time_remaining: '08:00' } }).remaining).toBe(0)
    expect(gameClock({ status: 'in_game', metadata: { quarter_num: '' } }).remaining).toBe(1)
  })

  it('carries the teams and the kickoff, from start_time or else date_time', () => {
    expect(gameClock({ status: 'pre_game', start_time: 1790295300000, metadata: { home_team: 'GB', away_team: 'ATL' } })).toEqual({
      status: 'pre',
      remaining: 1,
      home: 'GB',
      away: 'ATL',
      kickoff: 1790295300000,
    })
    expect(gameClock({ metadata: { date_time: '2026-09-27T17:00:00+00:00' } }).kickoff).toBe(Date.parse('2026-09-27T17:00:00Z'))
    expect(gameClock({ metadata: {} }).kickoff).toBeUndefined()
  })
})

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)

afterEach(() => vi.unstubAllGlobals())

describe('fetchNflWeekGames', () => {
  it('keys each game by both teams', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok([{ status: 'complete', metadata: { home_team: 'GB', away_team: 'ATL' } }])))
    const games = await fetchNflWeekGames('2026', 3)
    expect(games.GB).toEqual({ status: 'final', remaining: 0, home: 'GB', away: 'ATL' })
    expect(games.ATL).toBe(games.GB)
  })
})

describe('fetchWeekProjections', () => {
  it('keeps each player\'s team and numeric stats only, and caches the week', async () => {
    const fetchMock = vi.fn(() => ok([{ player_id: '4881', team: 'BAL', stats: { pass_yd: 274.2, note: 'x' } }, { player_id: 'fa', team: null, stats: {} }]))
    vi.stubGlobal('fetch', fetchMock)
    const projections = await fetchWeekProjections('2099', 1)
    expect(projections['4881']).toEqual({ team: 'BAL', stats: { pass_yd: 274.2 } })
    expect(projections.fa).toEqual({ stats: {} })
    await fetchWeekProjections('2099', 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
