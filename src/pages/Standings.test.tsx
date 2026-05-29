import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Standings } from './Standings'
import manifest from '../../public/data/seasons.json'
import premier2025 from '../../public/data/2025/premier.json'

const FILES: Record<string, unknown> = {
  '/data/seasons.json': manifest,
  '/data/2025/premier.json': premier2025,
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

it('renders the latest season grouped by division with team rows', async () => {
  renderAt('/standings')
  // 2025 (latest) Premier has divisions.
  await waitFor(() => expect(screen.getByText('Diamond')).toBeInTheDocument())
  expect(screen.getByText('Platinum')).toBeInTheDocument()
  expect(screen.getByText('Gold')).toBeInTheDocument()
  // 12 teams across the division tables.
  expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(12)
})
