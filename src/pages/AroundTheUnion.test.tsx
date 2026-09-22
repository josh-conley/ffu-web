import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AroundTheUnion } from './AroundTheUnion'

// Renders against the LIVE data files, so every assertion here must hold in ANY week: the Tuesday
// refresh moves them on, and a test pinned to "week 1, no form yet" takes the scheduled job red on
// data that is perfectly good. Behaviour that is only true in a particular week belongs in a
// component test with its own props (see components/recap/WeekStreaks.test.tsx).
const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

// Stubbed for the WHOLE file rather than per test: the provider caches one promise per path, so a
// fetch still in flight when a test tore the stub down would reject and poison every later test
// that wanted the same file (the lineups, which arrive after the page's first paint).
beforeAll(() =>
  vi.stubGlobal('fetch', (url: string) =>
    Promise.resolve(
      FILES[url] === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => FILES[url] } as Response),
    ),
  ),
)
afterAll(() => vi.unstubAllGlobals())

function renderPage(entry = '/around-the-union') {
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

describe('the FFUN layout', () => {
  it('shows the same numbers as the standard one, in the newsletter\'s bands', async () => {
    renderPage('/around-the-union?layout=ffun')
    await ready()
    // The section headings and the race TABLE are gone — that is the vertical space being saved.
    expect(screen.queryByText(/Top Scores/)).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    // ...but all three leagues' figures are still on the strip.
    // Scoped to the footer strip — a league name also appears on the podium above it.
    const strip = within(screen.getByText('Avg Game / Total League Points').parentElement!)
    for (const league of ['Premier', 'Masters', 'National']) expect(strip.getByText(league)).toBeInTheDocument()
    // Each league carries both figures: average, then total.
    expect(strip.getAllByText(/^[\d,]+\.\d+$/)).toHaveLength(6)
  })

  it('is reachable from the toggle and lands in the URL', async () => {
    renderPage()
    await ready()
    expect(screen.getByRole('table')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'FFUN' }))
    await waitFor(() => expect(screen.queryByRole('table')).not.toBeInTheDocument())
    expect(screen.getByText('Avg Game / Total League Points')).toBeInTheDocument()
  })

  it('falls back to standard for an unknown layout', async () => {
    renderPage('/around-the-union?layout=nonsense')
    await ready()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

it('lets an author step back to an earlier week when more than one has been played', async () => {
  renderPage()
  await ready()
  const picker = screen.queryByRole('combobox')
  if (picker === null) return // only one week on file so far — the picker is deliberately hidden
  await userEvent.selectOptions(picker, '1')
  await waitFor(() => expect(screen.getByText('Week 1 — Top Scores')).toBeInTheDocument())
})

it('reports the bottom of the week and the four matchup stories', async () => {
  renderPage()
  await ready()
  expect(screen.getByText('Lowest Scores')).toBeInTheDocument()
  expect(screen.getByText('Week in Review')).toBeInTheDocument()
  expect(screen.getByText('Biggest Blowout')).toBeInTheDocument()
  expect(screen.getByText('Closest Call')).toBeInTheDocument()
  expect(screen.getByText('Highest Scoring Loss')).toBeInTheDocument()
  expect(screen.getByText('Lowest Scoring Win')).toBeInTheDocument()
})

it('gives every block its own copy button in the FFUN layout only', async () => {
  const { unmount } = renderPage()
  await ready()
  // The standard layout is the reading view — nothing to copy.
  expect(screen.queryAllByRole('button', { name: /copy the panel/i })).toHaveLength(0)
  unmount()

  renderPage('/around-the-union?layout=ffun')
  await ready()
  // One per block that has something to report this week.
  await waitFor(() => expect(screen.getAllByRole('button', { name: /copy the panel/i }).length).toBeGreaterThanOrEqual(5))
})

it('carries the FFU own weekly colour: the belt, and the marks about to fall', async () => {
  renderPage()
  await ready()
  expect(screen.getByText('Lineal Champ — Belt Watch')).toBeInTheDocument()
  // The belt's chain of custody: the handovers that led to today's holder, with the scores.
  const chain = screen.getByRole('list', { name: 'Belt chain of custody' })
  expect(within(chain).getAllByRole('listitem').length).toBeGreaterThan(1)
  expect(within(chain).getAllByText(/^\d+ wks?$/).length).toBeGreaterThan(0)
  expect(screen.getByText('Milestone Watch')).toBeInTheDocument()
})
