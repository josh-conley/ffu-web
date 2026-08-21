import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Cup } from './Cup'

// Serve public/data straight off disk, so the page reads the same 2026 Cup file the site ships.
const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) {
  FILES[path.replace('../../public', '')] = mod
}

// Cumulative across the file: the provider caches one promise per path, so only the FIRST test to
// render actually issues the fetches. Never reset — that keeps the assertions order-independent.
const fetched: string[] = []

beforeEach(() => {
  vi.stubGlobal('fetch', (url: string) => {
    fetched.push(url)
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })
})
afterEach(() => vi.unstubAllGlobals())

async function renderCup() {
  render(
    <MemoryRouter initialEntries={['/cup']}>
      <Routes>
        <Route path="cup" element={<Cup />} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByRole('heading', { name: 'FFU Cup' })).toBeInTheDocument())
}

it('previews the inaugural Cup: facts, schedule, rules, draw and prizing', async () => {
  await renderCup()

  expect(screen.getByText('Inaugural season')).toBeInTheDocument()
  // Field size comes from the data, not the copy.
  expect(screen.getByText('Teams', { selector: 'dt' }).parentElement).toHaveTextContent('36')
  expect(screen.getByRole('heading', { name: /Schedule of events/i })).toBeInTheDocument()

  // Schedule table: the Round of 36 is 18 games in week 6.
  const openingRow = screen.getByRole('cell', { name: 'Round of 36' }).closest('tr')
  expect(openingRow).not.toBeNull()
  expect(openingRow!).toHaveTextContent('6')
  expect(openingRow!).toHaveTextContent('18')

  // The one bracket irregularity is stated in the round rules.
  expect(screen.getByText(/lowest-scoring winner of the round, who is eliminated/i)).toBeInTheDocument()
  // ...and the draw's constrained pool.
  expect(screen.getByText(/six teams from one league have been drawn/i)).toBeInTheDocument()
  // Amounts are unannounced for 2026, so every round reads TBA rather than a guessed number.
  expect(screen.getAllByText('TBA')).toHaveLength(5)
  expect(screen.getByText(/FA Cup Winner/)).toBeInTheDocument()
})

it('shows the empty bracket outline and loads no tier data before the draw', async () => {
  await renderCup()

  expect(screen.getByLabelText(/the draw has not been held/i)).toBeInTheDocument()
  expect(fetched).toContain('/data/2026/tournament.json')
  // Gating matters: 2026 is still being played, so its per-tier files do not exist yet.
  expect(fetched.filter((u) => /2026\/(premier|masters|national)\.json/.test(u))).toHaveLength(0)
})
