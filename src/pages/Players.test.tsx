import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Players } from './Players'
import { nameForYear } from '@/config'

// Reads the real public/data files, which the Tuesday refresh rewrites. Every assertion here must
// hold in ANY week of the live season (ai-docs/DECISIONS.md, 2026-09-22): only completed seasons'
// facts, or orderings, never counts that move.

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

afterEach(() => vi.unstubAllGlobals())

function renderPage() {
  vi.stubGlobal('fetch', (url: string) =>
    Promise.resolve(
      FILES[url] === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => FILES[url] } as Response),
    ),
  )
  return render(
    <MemoryRouter>
      <Players />
    </MemoryRouter>,
  )
}

/** The list item in a highlights section whose text contains every one of `parts`. */
const itemWith = (section: string, parts: string[]) =>
  within(screen.getByRole('heading', { name: section }).closest('section') as HTMLElement)
    .getAllByRole('listitem')
    .filter((li) => parts.every((p) => li.textContent?.includes(p)))

// Clickable rows take a button role, so the body rows are found by element rather than by role.
const bodyRows = () => [...document.querySelectorAll<HTMLElement>('tbody tr')]

const points = (row: HTMLElement) => Number(within(row).getAllByRole('cell')[1]!.textContent)

async function ready() {
  renderPage()
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Players' })).toBeInTheDocument())
}

/** Searches for one player and opens his row. */
async function open(name: string) {
  await userEvent.type(screen.getByRole('searchbox'), name)
  const [row] = screen.getAllByRole('button', { name: new RegExp(name, 'i') })
  await userEvent.click(row!)
}

describe('Players table', () => {
  it('ranks players by the points they scored in FFU lineups', async () => {
    await ready()
    const rows = bodyRows()
    expect(rows.length).toBe(50) // first page
    const pts = rows.map(points)
    expect(pts).toEqual([...pts].sort((a, b) => b - a))
  })

  it('searches by name, ignoring case and punctuation', async () => {
    await ready()
    await userEvent.type(screen.getByRole('searchbox'), 'justin jeff')
    const rows = bodyRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Justin Jefferson')
  })

  it('opens a row in place with where he was drafted', async () => {
    await ready()
    await open('justin jefferson')
    // The 2023 Premier draft opened with him.
    expect(itemWith('Drafted', ['2023', 'Premier', 'Rd 1 · #1'])).toHaveLength(1)
  })

  it('lists the title games he started in, with how they went', async () => {
    await ready()
    // Bucky Irving started for the 2024 Premier champion in the final.
    await open('bucky irving')
    const champion = nameForYear('ffu-009', '2024')!
    expect(itemWith('Title Games', ['2024', 'Premier', champion, '26.00', 'Won'])).toHaveLength(1)
  })

  it('closes the row when it is clicked again', async () => {
    await ready()
    await open('bucky irving')
    expect(screen.getByRole('heading', { name: 'Title Games' })).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /bucky irving/i })[0]!)
    expect(screen.queryByRole('heading', { name: 'Title Games' })).not.toBeInTheDocument()
  })
})
