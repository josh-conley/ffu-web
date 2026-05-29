import { StaticFileProvider } from './staticProvider'
import manifest from '../../public/data/seasons.json'
import premier2024 from '../../public/data/2024/premier.json'
import premier2024Draft from '../../public/data/2024/premier.draft.json'

// Serve the real migrated files from a path→JSON map; anything else is a 404.
const FILES: Record<string, unknown> = {
  '/data/seasons.json': manifest,
  '/data/2024/premier.json': premier2024,
  '/data/2024/premier.draft.json': premier2024Draft,
}

function mapFetch(url: string): Promise<Response> {
  const body = FILES[url]
  if (body === undefined) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response)
  return Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
}

afterEach(() => vi.unstubAllGlobals())

describe('StaticFileProvider (against real migrated data)', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(mapFetch)))

  it('reads the manifest (20 tier-seasons)', async () => {
    const seasons = await new StaticFileProvider().getSeasons()
    expect(seasons).toHaveLength(20)
    expect(seasons.find((s) => s.tier === 'PREMIER' && s.year === '2025')?.hasDivisions).toBe(true)
  })

  it('loads and validates a Sleeper-era season', async () => {
    const season = await new StaticFileProvider().getSeason('PREMIER', '2024')
    expect(season.era).toBe('sleeper')
    expect(season.teams).toHaveLength(12)
    expect(season.games.length).toBeGreaterThan(0)
    expect(season.teams.every((t) => t.memberId.startsWith('ffu-'))).toBe(true)
  })

  it('loads a draft', async () => {
    const draft = await new StaticFileProvider().getDraft('PREMIER', '2024')
    expect(draft?.picks.length).toBeGreaterThan(0)
    expect(draft?.picks[0]?.memberId).toMatch(/^ffu-/)
  })

  it('returns null for a tier-season with no draft file', async () => {
    // Masters did not exist in 2019 (ESPN era) — its draft file 404s.
    expect(await new StaticFileProvider().getDraft('MASTERS', '2019')).toBeNull()
  })

  it('coalesces repeated reads into one fetch', async () => {
    const fetchMock = vi.fn(mapFetch)
    vi.stubGlobal('fetch', fetchMock)
    const p = new StaticFileProvider()
    await Promise.all([p.getSeason('PREMIER', '2024'), p.getSeason('PREMIER', '2024')])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws on a malformed file', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: true, status: 200, json: async () => ({ schemaVersion: 99 }) } as Response),
    )
    await expect(new StaticFileProvider().getSeason('PREMIER', '2024')).rejects.toThrow(/schemaVersion/)
  })
})
