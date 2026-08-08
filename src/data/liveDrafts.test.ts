import { fetchDraftSchedule, fetchDraftSchedules } from './liveDrafts'

const SCHEDULED = { draft_id: 'd1', start_time: 1787445046000, status: 'pre_draft', created: 1784394608111 }
const UNSCHEDULED = { draft_id: 'd2', start_time: null, status: 'pre_draft', created: 1784394608222 }

function mapFetch(url: string): Promise<Response> {
  const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
  if (url.endsWith('/league/lg-set/drafts')) return ok([SCHEDULED])
  if (url.endsWith('/league/lg-unset/drafts')) return ok([UNSCHEDULED])
  if (url.endsWith('/league/lg-empty/drafts')) return ok([])
  // A mock/redraft created after the real one — the newest row wins.
  if (url.endsWith('/league/lg-many/drafts')) return ok([SCHEDULED, { ...UNSCHEDULED, created: SCHEDULED.created + 1 }])
  return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response)
}

afterEach(() => vi.unstubAllGlobals())
beforeEach(() => vi.stubGlobal('fetch', vi.fn(mapFetch)))

describe('fetchDraftSchedule', () => {
  it('maps a scheduled draft to epoch-ms startTime + status', async () => {
    expect(await fetchDraftSchedule('PREMIER', '2026', 'lg-set')).toEqual({
      tier: 'PREMIER',
      year: '2026',
      startTime: 1787445046000,
      status: 'pre_draft',
    })
  })

  it('reports startTime null when the commissioner has not set a date', async () => {
    const schedule = await fetchDraftSchedule('MASTERS', '2026', 'lg-unset')
    expect(schedule.startTime).toBeNull()
  })

  it('treats a league with no draft object as unscheduled rather than throwing', async () => {
    expect(await fetchDraftSchedule('NATIONAL', '2026', 'lg-empty')).toEqual({
      tier: 'NATIONAL',
      year: '2026',
      startTime: null,
      status: 'pre_draft',
    })
  })

  it('picks the most recently created draft when a league has several', async () => {
    const schedule = await fetchDraftSchedule('PREMIER', '2026', 'lg-many')
    expect(schedule.startTime).toBeNull()
  })

  it('throws when Sleeper returns a non-array', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response)))
    await expect(fetchDraftSchedule('PREMIER', '2026', 'lg-set')).rejects.toThrow('not an array')
  })
})

describe('fetchDraftSchedules', () => {
  it('returns one entry per configured tier, in leagueIds order', async () => {
    const schedules = await fetchDraftSchedules('2026', { PREMIER: 'lg-set', MASTERS: 'lg-unset' })
    expect(schedules.map((s) => [s.tier, s.startTime])).toEqual([
      ['PREMIER', 1787445046000],
      ['MASTERS', null],
    ])
  })
})
