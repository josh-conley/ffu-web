import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Players } from './Players'
import { PlayerDetail } from './PlayerDetail'
import { nameForYear } from '@/config'

// Reads the real public/data files, which the Tuesday refresh rewrites. Every assertion here must
// hold in ANY week of the live season (ai-docs/DECISIONS.md, 2026-09-22): only completed seasons'
// facts, or orderings, never counts that move.

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

afterEach(() => vi.unstubAllGlobals())

function renderAt(path: string) {
  vi.stubGlobal('fetch', (url: string) =>
    Promise.resolve(
      FILES[url] === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => FILES[url] } as Response),
    ),
  )
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/players" element={<Players />} />
        <Route path="/players/:playerId" element={<PlayerDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The list item in a highlights section whose text contains every one of `parts`. */
const itemWith = (section: string, parts: string[]) =>
  within(screen.getByRole('heading', { name: section }).closest('section') as HTMLElement)
    .getAllByRole('listitem')
    .filter((li) => parts.every((p) => li.textContent?.includes(p)))

const points = (row: HTMLElement) => Number(within(row).getAllByRole('cell')[1]!.textContent)

describe('Players index', () => {
  it('ranks players by the points they scored in FFU lineups', async () => {
    renderAt('/players')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Players' })).toBeInTheDocument())
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.length).toBe(50) // first page
    const pts = rows.map(points)
    expect(pts).toEqual([...pts].sort((a, b) => b - a))
  })

  it('searches by name, ignoring case and punctuation', async () => {
    renderAt('/players')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Players' })).toBeInTheDocument())
    await userEvent.type(screen.getByRole('searchbox'), 'justin jeff')
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(1)
    expect(within(rows[0]!).getByRole('link', { name: /Justin Jefferson/ })).toHaveAttribute('href', '/players/6794')
  })
})

describe('Player detail', () => {
  it("shows where he was drafted, from the completed seasons' boards", async () => {
    renderAt('/players/6794')
    await waitFor(() => expect(screen.getByRole('heading', { name: /Justin Jefferson/ })).toBeInTheDocument())
    // The 2023 Premier draft opened with him.
    expect(itemWith('Drafted', ['2023', 'Premier', 'Rd 1 · #1'])).toHaveLength(1)
  })

  it('credits the titles he started in', async () => {
    // Bucky Irving started for the 2024 Premier champion in the final.
    renderAt('/players/11584')
    await waitFor(() => expect(screen.getByRole('heading', { name: /Bucky Irving/ })).toBeInTheDocument())
    const champion = nameForYear('ffu-009', '2024')!
    expect(itemWith('Championships', ['2024', 'Premier', champion, '26.00 in the final'])).toHaveLength(1)
  })

  it('says so for a player FFU never rostered', async () => {
    renderAt('/players/not-a-player')
    await waitFor(() => expect(screen.getByText(/No FFU team has rostered this player/)).toBeInTheDocument())
  })
})
