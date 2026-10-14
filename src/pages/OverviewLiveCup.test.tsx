import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS } from '@/config'
import { Overview } from './Overview'

// The home page in a week the Cup is played (2026's Round of 36 is week 6). Its own file because
// the live season is fetched through a module-scope cache keyed by year+week (see OverviewLive.test).

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
const notFound = () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response)

const ids = LIVE_LEAGUE_IDS['2026'] as Record<Tier, string>

// The Round of 36's first game: Shton's Strikers (ffu-044, Premier) against ffu-038 (Masters), each
// playing a game in their own league, against ffu-001 / ffu-002. Real Sleeper owner ids, from members.ts.
const OWNERS: Partial<Record<Tier, [string, string]>> = {
  PREMIER: ['467553389673181184', '331590801261883392'],
  MASTERS: ['1124071986805829632', '396808818157182976'],
}
const tierOf = (url: string) => (Object.keys(ids) as Tier[]).find((t) => url.includes(ids[t]))

beforeAll(() => {
  vi.setSystemTime(new Date('2026-10-15T15:00:00Z')) // a Thursday of week 6
  vi.stubGlobal('fetch', (url: string) => {
    if (url.includes('/state/nfl')) return ok({ week: 6, season_type: 'regular', season: '2026', season_start_date: '2026-09-09' })
    const tier = tierOf(url)
    const owners = tier && OWNERS[tier]
    if (tier && url.includes('/rosters')) return ok(owners ? owners.map((owner_id, i) => ({ roster_id: i + 1, owner_id })) : [])
    if (tier && url.includes('/matchups/')) return ok(owners ? [{ roster_id: 1, matchup_id: 1, points: tier === 'PREMIER' ? 88.5 : 71.25 }, { roster_id: 2, matchup_id: 1, points: 50 }] : [])
    if (url.includes('/drafts')) return ok([])
    return FILES[url] === undefined ? notFound() : ok(FILES[url])
  })
})
afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it("offers the Cup round's matchups beside the league week, scored live across the leagues", async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  const tabs = within(await screen.findByRole('tablist', { name: 'Which week' })).getAllByRole('tab')
  expect(tabs.map((t) => t.textContent)).toEqual(['Week 6', 'FFU Cup · Round of 36'])
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true')

  fireEvent.click(tabs[1]!)
  const panel = screen.getByRole('tabpanel')
  expect(within(panel).getByRole('heading', { name: 'FFU Cup · Round of 36' })).toBeInTheDocument()
  // All 18 games, each a card opening the box score.
  expect(within(panel).getAllByRole('button', { name: /lineups/i })).toHaveLength(18)
  const first = within(panel).getAllByRole('button', { name: /lineups/i })[0]!
  expect(first).toHaveTextContent('88.50')
  expect(first).toHaveTextContent('71.25')
  expect(first).toHaveTextContent(/Premier/)
  expect(first).toHaveTextContent(/Masters/)
  expect(screen.queryByRole('navigation', { name: 'Jump to league' })).not.toBeInTheDocument()
})
