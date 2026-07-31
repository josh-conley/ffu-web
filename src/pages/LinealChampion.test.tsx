import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LinealChampion } from './LinealChampion'

// Like Records, this page loads EVERY season — serve them all from a glob-built path→JSON map.
const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) {
  FILES[path.replace('../../public', '')] = mod
}

afterEach(() => vi.unstubAllGlobals())

it('renders the current belt-holder, the holders table and the lineage', async () => {
  vi.stubGlobal('fetch', (url: string) => {
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })

  render(
    <MemoryRouter initialEntries={['/lineal']}>
      <Routes>
        <Route path="lineal" element={<LinealChampion />} />
      </Routes>
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Lineal Championship' })).toBeInTheDocument()

  await waitFor(() => expect(screen.getByText('Lineal Champion')).toBeInTheDocument())
  expect(screen.getByRole('heading', { name: /The Lineage · \d+ Reigns/ })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /Weeks Held/ })).toBeInTheDocument()
  // Exactly one reign is live, so exactly one row says so.
  expect(screen.getAllByText('Still holds the belt')).toHaveLength(1)
})
