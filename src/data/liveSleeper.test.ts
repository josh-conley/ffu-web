import { fetchLiveLineups, fetchLiveSeason, fetchMissingPlayers, fetchNflState } from './liveSleeper'

// Real ffu-001/ffu-002 sleeper owner ids from src/config/members.ts; 'owner-unmapped' deliberately
// isn't in MEMBERS, standing in for a new member not yet added to config (the day-one-of-2026 case).
const ROSTERS = [
  { roster_id: 1, owner_id: '331590801261883392' }, // ffu-001
  { roster_id: 2, owner_id: '396808818157182976' }, // ffu-002
  { roster_id: 3, owner_id: 'owner-unmapped' },
  { roster_id: 4, owner_id: 'owner-unmapped-2' },
]

const WEEK_1_MATCHUPS = [
  { roster_id: 1, matchup_id: 10, points: 100.5, starters: ['p1', 'p2'], starters_points: [60, 40.5], players: ['p1', 'p2', 'p3'], players_points: { p1: 60, p2: 40.5, p3: 5 } },
  { roster_id: 2, matchup_id: 10, points: 90.25, starters: ['p4'], starters_points: [90.25], players: ['p4'], players_points: { p4: 90.25 } },
  { roster_id: 3, matchup_id: 11, points: 80 },
  { roster_id: 4, matchup_id: 11, points: 70 },
]

function mapFetch(url: string): Promise<Response> {
  const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
  if (url.endsWith('/state/nfl')) return ok({ week: 5, season_type: 'regular', season: '2025' })
  if (url.endsWith('/league/lg1')) return ok({ roster_positions: ['QB', 'RB', 'BN', 'BN'] })
  if (url.endsWith('/league/lg1/rosters')) return ok(ROSTERS)
  if (url.endsWith('/league/lg1/matchups/1')) return ok(WEEK_1_MATCHUPS)
  if (url.endsWith('/league/lg1/matchups/2')) return ok([])
  return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response)
}

afterEach(() => vi.unstubAllGlobals())
beforeEach(() => vi.stubGlobal('fetch', vi.fn(mapFetch)))

describe('fetchNflState', () => {
  it('maps Sleeper snake_case fields to our shape', async () => {
    expect(await fetchNflState()).toEqual({ week: 5, seasonType: 'regular', year: '2025' })
  })
})

describe('fetchLiveSeason', () => {
  it('maps a resolvable pairing to a Game via the roster->ffuId map', async () => {
    const data = await fetchLiveSeason('PREMIER', '2025', 'lg1', 1)
    expect(data.games).toHaveLength(1)
    expect(data.games[0]).toEqual({
      week: 1,
      isPlayoff: false,
      participants: [
        { memberId: 'ffu-001', score: 100.5 },
        { memberId: 'ffu-002', score: 90.25 },
      ],
    })
  })

  it('drops a pairing where a roster has no matching Member yet, and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = await fetchLiveSeason('PREMIER', '2025', 'lg1', 1)
    expect(data.games.some((g) => g.participants.some((p) => p.memberId.startsWith('owner-')))).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('memberIds only includes mapped rosters', async () => {
    const data = await fetchLiveSeason('PREMIER', '2025', 'lg1', 1)
    expect(new Set(data.memberIds)).toEqual(new Set(['ffu-001', 'ffu-002']))
  })

  it('fetches every week from 1 through currentWeek', async () => {
    const fetchMock = vi.fn(mapFetch)
    vi.stubGlobal('fetch', fetchMock)
    await fetchLiveSeason('PREMIER', '2025', 'lg1', 2)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/matchups/1'))
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/matchups/2'))
  })
})

describe('fetchLiveLineups', () => {
  it('builds starters + bench for each named member from the matchup entry', async () => {
    const data = await fetchLiveLineups('lg1', 1, ['ffu-001', 'ffu-002'])
    expect(data.slots).toEqual(['QB', 'RB'])
    const [a, b] = data.teams
    expect(a).toEqual({ memberId: 'ffu-001', starters: [{ playerId: 'p1', points: 60 }, { playerId: 'p2', points: 40.5 }], bench: [{ playerId: 'p3', points: 5 }] })
    expect(b).toEqual({ memberId: 'ffu-002', starters: [{ playerId: 'p4', points: 90.25 }], bench: [] })
  })
})

describe('fetchMissingPlayers', () => {
  it('only fetches ids absent from the known static map', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/players/nfl')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ p3: { full_name: 'Third Player', position: 'WR' } }) } as Response)
      return mapFetch(url)
    })
    vi.stubGlobal('fetch', fetchMock)
    const out = await fetchMissingPlayers(['p1', 'p3'], { p1: { name: 'Known Player', position: 'QB' } })
    expect(out).toEqual({ p3: { name: 'Third Player', position: 'WR' } })
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/players/nfl'))
  })

  it('skips the network call entirely when nothing is missing', async () => {
    const fetchMock = vi.fn(mapFetch)
    vi.stubGlobal('fetch', fetchMock)
    const out = await fetchMissingPlayers(['p1'], { p1: { name: 'Known Player', position: 'QB' } })
    expect(out).toEqual({})
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
