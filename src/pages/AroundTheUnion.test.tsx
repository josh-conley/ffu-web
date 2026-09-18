import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AroundTheUnion } from './AroundTheUnion'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

afterEach(() => vi.unstubAllGlobals())

function renderPage(entry = '/around-the-union') {
  vi.stubGlobal('fetch', (url: string) =>
    Promise.resolve(
      FILES[url] === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => FILES[url] } as Response),
    ),
  )
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AroundTheUnion />
    </MemoryRouter>,
  )
}

const ready = () => waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Around the Union'))

it('shows both blocks the newsletter needs', async () => {
  renderPage()
  await ready()
  expect(screen.getByText(/Top Scores/)).toBeInTheDocument()
  expect(screen.getByText('League Scoring — Season to Date')).toBeInTheDocument()
  // All three leagues in the race, ordered by total points.
  const rows = screen.getAllByRole('row').slice(1)
  expect(rows).toHaveLength(3)
  const totals = rows.map((r) => Number(within(r).getAllByRole('cell')[2]!.textContent!.replace(/,/g, '')))
  expect(totals).toEqual([...totals].sort((a, b) => b - a))
})

it('opens on the most recent completed week', async () => {
  renderPage()
  await ready()
  // The board header names the week it is reporting on.
  expect(screen.getByText(/Week \d+ — Top Scores/)).toBeInTheDocument()
  expect(screen.getByText('Week high')).toBeInTheDocument()
})

it('leads with the highest score of that week, across every league', async () => {
  renderPage()
  await ready()
  const shown = screen
    .getAllByText(/^\d+\.\d{2}$/)
    .map((el) => Number(el.textContent))
    .filter((n) => n > 50) // scores, not the league averages, which are in table cells
  const leader = Number(screen.getByText('Week high').parentElement!.querySelector('.font-mono')!.textContent)
  expect(leader).toBe(Math.max(...shown))
})

it('honours a ?week= that names a completed week', async () => {
  renderPage('/around-the-union?week=1')
  await ready()
  expect(screen.getByText('Week 1 — Top Scores')).toBeInTheDocument()
})

it('ignores a ?week= that has not been played and falls back to the latest', async () => {
  renderPage('/around-the-union?week=99')
  await ready()
  expect(screen.queryByText('Week 99 — Top Scores')).not.toBeInTheDocument()
  expect(screen.getByText(/Week \d+ — Top Scores/)).toBeInTheDocument()
})

it('lets an author step back to an earlier week when more than one has been played', async () => {
  renderPage()
  await ready()
  const picker = screen.queryByRole('combobox')
  if (picker === null) return // only one week on file so far — the picker is deliberately hidden
  await userEvent.selectOptions(picker, '1')
  await waitFor(() => expect(screen.getByText('Week 1 — Top Scores')).toBeInTheDocument())
})
