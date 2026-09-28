import { sleeperGet } from './sleeperApi'

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('sleeperGet in-memory cache', () => {
  it('shares one request between callers inside the max age, in flight or settled', async () => {
    const fetchMock = vi.fn(() => ok([1]))
    vi.stubGlobal('fetch', fetchMock)
    const [a, b] = await Promise.all([sleeperGet('/league/x/rosters'), sleeperGet('/league/x/rosters')])
    await sleeperGet('/league/x/rosters')
    expect(a).toEqual([1])
    expect(b).toBe(a)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('asks again once the answer is older than the caller will take', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const fetchMock = vi.fn(() => ok([]))
    vi.stubGlobal('fetch', fetchMock)
    await sleeperGet('/league/x/matchups/3')
    vi.setSystemTime(Date.now() + 60_000)
    await sleeperGet('/league/x/matchups/3')
    await sleeperGet('/league/x/matchups/3', { maxAgeMs: Infinity })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('always goes to the network for a fresh read, and the next ordinary read reuses it', async () => {
    const fetchMock = vi.fn((url: string) => ok(url.includes('_=') ? 'fresh' : 'cdn'))
    vi.stubGlobal('fetch', fetchMock)
    expect(await sleeperGet('/league/x/matchups/3')).toBe('cdn')
    expect(await sleeperGet('/league/x/matchups/3', { fresh: true })).toBe('fresh')
    expect(await sleeperGet('/league/x/matchups/3')).toBe('fresh')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not keep a failure', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 } as Response).mockImplementation(() => ok('back'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(sleeperGet('/league/x')).rejects.toThrow('HTTP 500')
    expect(await sleeperGet('/league/x')).toBe('back')
  })
})
