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

const ready = () => waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Playoff Odds'))

const table = () => screen.getByRole('table')
const headers = () => within(table()).getAllByRole('columnheader').map((h) => h.textContent)

it('shows one table: every win-loss record, its odds now and after a win or a loss', async () => {
  renderPage('/playoff-odds?games=10')
  await ready()
  expect(screen.getAllByRole('table')).toHaveLength(1)
  const records = within(table()).getAllByRole('rowheader').map((h) => h.textContent)
  // 10-0 down to 0-10, and no tied record takes a row.
  expect(records).toEqual(Array.from({ length: 11 }, (_, i) => `${10 - i}-${i}`))
  expect(headers().slice(0, 4)).toEqual(['Record', 'Playoff oddsafter game 10', 'With a winafter game 11', 'With a lossafter game 11'])
})

it('draws on the current-length seasons by default, with a toggle to pool in the shorter ones', async () => {
  renderPage('/playoff-odds?games=10')
  await ready()
  expect(screen.getByText(/From the 2021–25 seasons/)).toBeInTheDocument()
  expect(screen.queryByText(/13 regular-season games/)).not.toBeInTheDocument()
  const toggle = screen.getByRole('button', { name: 'Include 2018–20' })
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText(/From the 2018–25 seasons/)).toBeInTheDocument()
  expect(screen.getByText(/2018–20 seasons had 13 regular-season games, not 14/)).toBeInTheDocument()
})

it('drops the win and loss columns after the last game', async () => {
  renderPage('/playoff-odds?games=10')
  await ready()
  await userEvent.selectOptions(screen.getByRole('combobox'), '14')
  expect(headers()).not.toContain('With a winafter game 15')
  expect(headers()[1]).toBe('Playoff oddsafter game 14')
})

it('switches to odds by UPR range, without win or loss columns', async () => {
  renderPage('/playoff-odds?games=10')
  await ready()
  await userEvent.click(screen.getByRole('button', { name: 'By UPR' }))
  expect(screen.getByRole('button', { name: 'By UPR' })).toHaveAttribute('aria-pressed', 'true')
  expect(headers().slice(0, 2)).toEqual(['UPR', 'Playoff oddsafter game 10'])
  expect(headers().some((h) => /With a/.test(h ?? ''))).toBe(false)
  const ranges = within(table()).getAllByRole('rowheader').map((h) => h.textContent!)
  expect(ranges.every((r) => /^\d+–\d+9$/.test(r))).toBe(true)
  const floors = ranges.map((r) => Number(r.split('–')[0]))
  expect(floors).toEqual([...floors].sort((a, b) => b - a))
  expect(screen.getByText(/Ranges are raw UPR/)).toBeInTheDocument()
})

it('starts the UPR game picker where UPR starts', async () => {
  renderPage('/playoff-odds?by=upr&games=1')
  await ready()
  const options = within(screen.getByRole('combobox')).getAllByRole('option')
  expect(options[0]).toHaveTextContent(/^3 games/)
  expect(screen.getByRole('combobox')).not.toHaveValue('1')
})
