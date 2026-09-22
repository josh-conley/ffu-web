import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS } from '@/config'
import { Overview } from './Overview'

// The home page WITH a season in progress. Its own file because the live season is fetched through
// a module-scope cache keyed by year+week: Overview.test.tsx renders the same page with those
// fetches failing (the offseason view), and a cached failure there would poison this one.

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
const notFound = () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response)

const [year, ids] = Object.entries(LIVE_LEAGUE_IDS).at(-1) as [string, Record<Tier, string>]

// Two real members per league, so the standings can name them. Owner ids come from members.ts.
const OWNERS: Record<Tier, [string, string]> = {
  PREMIER: ['331590801261883392', '710981985102802944'],
  MASTERS: ['865323291064291328', '84006772809285632'],
  NATIONAL: ['1380233141997809664', '860973514839199744'],
}

const rosters = (tier: Tier) => OWNERS[tier].map((owner_id, i) => ({ roster_id: i + 1, owner_id }))
const matchups = (home: number) => [
  { roster_id: 1, matchup_id: 1, points: home },
  { roster_id: 2, matchup_id: 1, points: 100 },
]

function tierOf(url: string): Tier | undefined {
  return (Object.keys(ids) as Tier[]).find((t) => url.includes(ids[t]))
}

beforeAll(() => {
  // A Tuesday, so the live block leads with the standings rather than the matchups (homeLiveSection).
  vi.setSystemTime(new Date('2026-09-22T15:00:00Z'))
  vi.stubGlobal('fetch', (url: string) => {
    if (url.includes('/state/nfl')) return ok({ week: 3, season_type: 'regular', season: year, season_start_date: '2026-09-09' })
    const tier = tierOf(url)
    if (tier && url.includes('/rosters')) return ok(rosters(tier))
    // Week 1 and 2 are complete (the standings read those); week 3 is the one being played.
    if (tier && url.includes('/matchups/')) return ok(matchups(url.endsWith('/1') ? 120 : 90))
    if (url.includes('/drafts')) return ok([])
    return FILES[url] === undefined ? notFound() : ok(FILES[url])
  })
})
afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('leads with the standings the completed weeks produced', async () => {
  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByText(/^Standings — Through Week 2$/)).toBeInTheDocument())
  // One row per team, with the record and both points totals under the name (1 win, 1 loss each).
  expect(screen.getAllByText('1-1 · 210.00 PF · 200.00 PA').length).toBe(3)
})

it('drops the leagues card while the season is being played', async () => {
  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByText(/^Standings/)).toBeInTheDocument())
  // Who is in which league is exactly what the standings above already say.
  expect(screen.queryByText(/^20\d\d Leagues$/)).not.toBeInTheDocument()
})
