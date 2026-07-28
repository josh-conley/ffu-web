import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS } from '@/config'
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
  // Roster Build Stats banner links to the tool; Upcoming Drafts announcement is present (TBD per league).
  expect(screen.getByRole('link', { name: /Roster Build Stats/i })).toHaveAttribute('href', '/builds')
  expect(screen.getByText(/Draft Season Is Coming/i)).toBeInTheDocument()
  expect(screen.getAllByText(/TBD/).length).toBe(3)
})

// Sleeper's live roster read for next season. Answers any league rosters call (the ids come from
// LIVE_LEAGUE_IDS); assumes a season is configured there — if it ever isn't, this section is
// genuinely gone from the page and the assertions below should be retired with it.
it('lists next season\'s leagues with how each member got there', async () => {
  const ROSTERS: Record<string, { roster_id: number; owner_id: string | null }[]> = {
    // ffu-037 (Head Cow) was Masters in 2025 -> promoted; ffu-023 (Minutemen) was already Premier.
    PREMIER: [
      { roster_id: 1, owner_id: '865323291064291328' },
      { roster_id: 2, owner_id: '84006772809285632' },
      { roster_id: 3, owner_id: null }, // an unfilled slot
    ],
    // ffu-057 (YAC Attack) is a first-time member; ffu-012 dropped from Masters.
    NATIONAL: [
      { roster_id: 1, owner_id: '1380233141997809664' },
      { roster_id: 2, owner_id: '860973514839199744' },
    ],
  }
  const ids = Object.values(LIVE_LEAGUE_IDS).at(-1) as Record<Tier, string>
  vi.stubGlobal('fetch', (url: string) => {
    if (url.includes(ids.PREMIER)) return ok(ROSTERS.PREMIER)
    if (url.includes(ids.NATIONAL)) return ok(ROSTERS.NATIONAL)
    if (url.includes('/rosters')) return ok([])
    return FILES[url] === undefined ? notFound() : ok(FILES[url])
  })

  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )

  await waitFor(() => expect(screen.getByText(/^20\d\d Leagues$/)).toBeInTheDocument())
  expect(screen.getByText('Head Cow Always Grazing')).toBeInTheDocument()
  expect(screen.getByText('Tyler')).toBeInTheDocument() // the owner's name rides along with the team
  expect(screen.getByText('Promoted')).toBeInTheDocument()
  expect(screen.getByText('Relegated')).toBeInTheDocument()
  expect(screen.getByText('New')).toBeInTheDocument()
  // Members who stayed put get no tag, and unfilled seats are called out.
  expect(screen.getAllByText('The Minutemen').length).toBeGreaterThan(0) // also a past champion
  expect(screen.getByText(/1 pending member/)).toBeInTheDocument()
})
