import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Records } from './Records'

// Records loads EVERY season — serve them all from a glob-built path→JSON map.
const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) {
  FILES[path.replace('../../public', '')] = mod
}

afterEach(() => vi.unstubAllGlobals())

it('loads all seasons and renders a records leaderboard with pagination', async () => {
  vi.stubGlobal('fetch', (url: string) => {
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })

  render(
    <MemoryRouter initialEntries={['/records']}>
      <Routes>
        <Route path="records" element={<Records />} />
      </Routes>
    </MemoryRouter>,
  )

  // Mode selector (dropdown) is present immediately; the table fills once all seasons resolve.
  expect(screen.getByRole('combobox', { name: 'Record type' })).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('Page 1 of', { exact: false })).toBeInTheDocument())
  // pageSize 15 → 15 body rows + 1 header row.
  expect(screen.getAllByRole('row').length).toBe(16)
})
