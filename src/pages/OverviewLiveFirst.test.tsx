import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Overview } from './Overview'

// The live week comes from Sleeper, not the season files, so it must not wait on them. Here the
// season files never arrive at all.

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
const never = () => new Promise<Response>(() => {})

// Real ffu-001/ffu-002 Sleeper owner ids (src/config/members.ts), as in liveSleeper.test.ts.
const ROSTERS = [
  { roster_id: 1, owner_id: '331590801261883392' },
  { roster_id: 2, owner_id: '396808818157182976' },
]
const MATCHUP = [
  { roster_id: 1, matchup_id: 1, points: 61.5 },
  { roster_id: 2, matchup_id: 1, points: 48.25 },
]

function sleeper(url: string): Promise<Response> {
  if (url.includes('/state/nfl')) return ok({ week: 2, season_type: 'regular', season: '2026', season_start_date: '2026-09-10' })
  if (url.includes('/rosters')) return ok(ROSTERS)
  if (url.includes('/matchups/')) return ok(MATCHUP)
  if (url.includes('/drafts')) return ok([{ draft_id: 'd', start_time: 1, status: 'complete', created: 1 }])
  return never() // season files, the NFL feeds and anything else: still loading
}

// A Friday afternoon, so the page leads with the matchups (Tuesday would show the standings).
beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 8, 25, 14, 14) }))
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )

it('shows the live week while the season files are still loading', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubGlobal('fetch', vi.fn(sleeper))
  renderPage()

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fantasy Football Union')
  expect(await screen.findByRole('heading', { name: 'Week 2' })).toBeInTheDocument()
  expect(screen.getAllByText('61.50').length).toBeGreaterThan(0)
  // History sections each say they're loading instead of holding the whole page back.
  expect(screen.getByText('Loading champions…')).toBeInTheDocument()
})

it('holds the live section\'s place while its own data loads', () => {
  vi.stubGlobal('fetch', vi.fn(never))
  renderPage()
  expect(screen.getByRole('status', { name: /Loading this week's scores/ })).toBeInTheDocument()
})
