import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PlayoffOdds } from './PlayoffOdds'

// Renders against the LIVE data files, so every assertion must hold in any week of any season (the
// Tuesday refresh moves them on). Week-specific behaviour is pinned in the selector's tests.
const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

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

const renderPage = (entry = '/playoff-odds') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <PlayoffOdds />
    </MemoryRouter>,
  )

const ready = () => waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Playoff Odds by Record'))

it('shows the asked-for game count and the one after it, every record in each', async () => {
  renderPage('/playoff-odds?games=10')
  await ready()
  const [ten, eleven] = screen.getAllByRole('table')
  expect(screen.getByText('Playoff Odds After 10 Games')).toBeInTheDocument()
  expect(screen.getByText('Playoff Odds After 11 Games')).toBeInTheDocument()
  // 10-0 down to 0-10, plus any tied records history has.
  const records = within(ten!).getAllByRole('rowheader').map((h) => h.textContent)
  expect(records[0]).toBe('10-0')
  expect(records.at(-1)).toBe('0-10')
  expect(within(eleven!).getAllByRole('rowheader')[0]).toHaveTextContent('11-0')
})

it('shows the shorter ESPN-era seasons in their own column, with games left', async () => {
  renderPage('/playoff-odds?games=10')
  await ready()
  const head = within(screen.getAllByRole('table')[0]!).getAllByRole('columnheader').map((h) => h.textContent)
  expect(head.slice(0, 2)).toEqual(['Record', 'All seasons2018–25'])
  expect(head).toContain('2018–2013 games · 3 left')
  expect(head.some((h) => /14 games · 4 left/.test(h ?? ''))).toBe(true)
})

it('changes game count from the picker', async () => {
  renderPage('/playoff-odds?games=10')
  await ready()
  await userEvent.selectOptions(screen.getByRole('combobox'), '13')
  expect(screen.getByText('Playoff Odds After 13 Games')).toBeInTheDocument()
  // After 14 games no 13-game season is left to compare, and there is no next table.
  await userEvent.selectOptions(screen.getByRole('combobox'), '14')
  expect(screen.getAllByRole('table')).toHaveLength(1)
  expect(screen.queryByText(/13 games ·/)).not.toBeInTheDocument()
})
