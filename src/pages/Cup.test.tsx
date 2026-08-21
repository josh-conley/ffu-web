import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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

/** MemoryRouter never touches window.location, so surface the query string for assertions. */
function LocationProbe() {
  return <span data-testid="search">{useLocation().search}</span>
}

async function renderCup() {
  render(
    <MemoryRouter initialEntries={['/cup']}>
      <Routes>
        <Route
          path="cup"
          element={
            <>
              <Cup />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByRole('heading', { name: 'FFU Cup' })).toBeInTheDocument())
}

it('opens on the bracket, which is an empty outline until the draw is held', async () => {
  await renderCup()

  expect(screen.getByRole('tab', { name: 'Bracket' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText(/draw has not been held/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/the draw has not been held/i)).toBeInTheDocument()
  // Brief overview stays above the tabs, whichever tab is showing.
  expect(screen.getByText('Inaugural season')).toBeInTheDocument()
  expect(screen.getByText('Teams', { selector: 'dt' }).parentElement).toHaveTextContent('36')
})

it('loads no tier data before the draw', async () => {
  await renderCup()

  expect(fetched).toContain('/data/2026/tournament.json')
  // Gating matters: 2026 is still being played, so its per-tier files do not exist yet.
  expect(fetched.filter((u) => /2026\/(premier|masters|national)\.json/.test(u))).toHaveLength(0)
})

it('explains the format, the draw and the prizing on the Format & Rules tab', async () => {
  await renderCup()
  await userEvent.click(screen.getByRole('tab', { name: /Format & Rules/ }))

  // Schedule table: the Round of 36 is 18 games in week 6.
  const openingRow = screen.getByRole('cell', { name: 'Round of 36' }).closest('tr')
  expect(openingRow).not.toBeNull()
  expect(openingRow!).toHaveTextContent('6')
  expect(openingRow!).toHaveTextContent('18')

  // The one bracket irregularity is stated in the round rules...
  expect(screen.getByText(/lowest-scoring winner of the round, who is eliminated/i)).toBeInTheDocument()
  // ...and the draw's constrained pool.
  expect(screen.getByText(/six teams from one league have been drawn/i)).toBeInTheDocument()

  // Prizing is named by where a win gets you, and the champion's run totals 10+20+40+60+100.
  expect(screen.getByText('Win & advance to the Round of 18').parentElement).toHaveTextContent('$10')
  expect(screen.getByText('Win the Final').parentElement).toHaveTextContent('$100')
  expect(screen.getByText(/\$230/)).toBeInTheDocument()
  expect(screen.getByText(/FA Cup Winner/)).toBeInTheDocument()
})

it('keeps the selected tab in the URL so a view can be linked', async () => {
  await renderCup()
  await userEvent.click(screen.getByRole('tab', { name: /Format & Rules/ }))

  expect(screen.getByRole('tab', { name: /Format & Rules/ })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByTestId('search')).toHaveTextContent('view=format')
})
