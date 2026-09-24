import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Standings } from './Standings'
import manifest from '../../public/data/seasons.json'
import premier2025 from '../../public/data/2025/premier.json'
import premier2026 from '../../public/data/2026/premier.json'
import masters2025 from '../../public/data/2025/masters.json'
import national2025 from '../../public/data/2025/national.json'

const FILES: Record<string, unknown> = {
  '/data/seasons.json': manifest,
  '/data/2025/premier.json': premier2025,
  '/data/2026/premier.json': premier2026,
  '/data/2025/masters.json': masters2025,
  '/data/2025/national.json': national2025,
}

afterEach(() => vi.unstubAllGlobals())

function renderAt(path: string) {
  vi.stubGlobal('fetch', (url: string) => {
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="standings" element={<Standings />} />
      </Routes>
    </MemoryRouter>,
  )
}

it('renders a completed season grouped by division with team rows', async () => {
  renderAt('/standings?year=2025')
  // 2025 Premier has divisions.
  await waitFor(() => expect(screen.getByText('Diamond')).toBeInTheDocument())
  expect(screen.getByText('Platinum')).toBeInTheDocument()
  expect(screen.getByText('Gold')).toBeInTheDocument()
  // 12 teams across the division tables.
  expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(12)
})

it('shows the whole Union in one table when the Union scope is picked', async () => {
  renderAt('/standings?year=2025&scope=union')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Union' })).toHaveAttribute('aria-pressed', 'true'))
  // 36 teams across the three leagues, plus the header row.
  await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(37))
  const [, first] = screen.getAllByRole('row')
  // Ranked by UPR: the top row holds rank 1 and names the league it came from.
  expect(within(first!).getAllByRole('cell')[0]).toHaveTextContent('1')
  expect(screen.getAllByText(/Premier|Masters|National/).length).toBeGreaterThan(3)
})

it('leaves the Union view when a league is picked', async () => {
  renderAt('/standings?year=2025&scope=union')
  await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(37))
  await userEvent.click(screen.getByRole('button', { name: 'Masters' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Union' })).toHaveAttribute('aria-pressed', 'false'))
  // …and lands on the league picked, not back on Premier: leaving the Union and choosing the tier
  // are two URL writes from one click, and the second used to undo the first.
  expect(screen.getByRole('button', { name: 'Masters' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByRole('row').length).toBeLessThan(37)
})

it('switches between leagues', async () => {
  renderAt('/standings?year=2025')
  await waitFor(() => expect(screen.getByText('Diamond')).toBeInTheDocument())
  await userEvent.click(screen.getByRole('button', { name: 'National' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'National' })).toHaveAttribute('aria-pressed', 'true'))
  expect(screen.queryByText('Diamond')).not.toBeInTheDocument() // Premier's divisions are gone
})
