import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS } from '@/config'
import { draftDateTime } from '@/components/format'
import { Overview } from './Overview'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

afterEach(() => vi.unstubAllGlobals())

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
const notFound = () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response)

it('renders champions grouped by league', async () => {
  vi.stubGlobal('fetch', (url: string) => (FILES[url] === undefined ? notFound() : ok(FILES[url])))

  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByText('Champions by Season')).toBeInTheDocument())
  // 2024 Premier champion (ffu-009) shows its current name.
  expect(screen.getAllByText('Fort Wayne Banana Bread').length).toBeGreaterThan(0)
  // The front-door promo points at the Cup; Upcoming Drafts announcement is present (TBD per league).
  expect(screen.getByRole('link', { name: /FFU Cup/i })).toHaveAttribute('href', '/cup')
  expect(screen.getByText(/Draft Season Is Coming/i)).toBeInTheDocument()
  expect(screen.getAllByText(/TBD/).length).toBe(3)
})

// Draft dates come live from Sleeper (no hand-entered config), so the page must show a date for a
// league whose draft is set while the others still read TBD.
it('shows a scheduled draft date and leaves unscheduled leagues TBD', async () => {
  const START = 1787445046000
  const ids = Object.values(LIVE_LEAGUE_IDS).at(-1) as Record<Tier, string>
  vi.stubGlobal('fetch', (url: string) => {
    if (url.includes(`${ids.PREMIER}/drafts`)) return ok([{ draft_id: 'd1', start_time: START, status: 'pre_draft', created: 1 }])
    if (url.includes('/drafts')) return ok([{ draft_id: 'd2', start_time: null, status: 'pre_draft', created: 1 }])
    if (url.includes('/rosters')) return ok([])
    return FILES[url] === undefined ? notFound() : ok(FILES[url])
  })

  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )

  await waitFor(() => expect(screen.getByText(draftDateTime(START))).toBeInTheDocument())
  // The two unscheduled leagues keep their marker (matched exactly, so the body copy's "TBD" doesn't count).
  expect(screen.getAllByText('— TBD').length).toBe(2)
})

it('heads the champions section with the last DECIDED season, not the one being played', async () => {
  vi.stubGlobal('fetch', (url: string) => (FILES[url] === undefined ? notFound() : ok(FILES[url])))

  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByText('Champions by Season')).toBeInTheDocument())
  // 2026 has a data file from the day its leagues were created, but nobody has won it. Heading the
  // page "2026 Champions" over three blank slots — or opening the table with an empty 2026 row —
  // is the failure this guards.
  expect(screen.getByText('2025 Champions')).toBeInTheDocument()
  expect(screen.queryByText('2026 Champions')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /^2026$/ })).not.toBeInTheDocument()
})
