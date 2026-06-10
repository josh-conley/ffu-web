import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Drafts } from './Drafts'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

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
        <Route path="drafts" element={<Drafts />} />
      </Routes>
    </MemoryRouter>,
  )
}

it('renders the draft board for a season', async () => {
  renderAt('/drafts?year=2024&tier=PREMIER')
  // #1 overall pick in 2024 Premier — the board abbreviates names to "F. Last" to fit all columns.
  await waitFor(() => expect(screen.getByText('C. McCaffrey')).toBeInTheDocument())
})

it('switches to the list view', async () => {
  renderAt('/drafts?year=2024&tier=PREMIER&view=list')
  await waitFor(() => expect(screen.getByRole('columnheader', { name: 'Player' })).toBeInTheDocument())
  expect(screen.getByText('Christian McCaffrey')).toBeInTheDocument()
})

it('filters the list by position from the URL', async () => {
  // pos=QB should exclude the #1 RB (McCaffrey) but still render some rows.
  renderAt('/drafts?year=2024&tier=PREMIER&view=list&pos=QB')
  await waitFor(() => expect(screen.getByRole('columnheader', { name: 'Player' })).toBeInTheDocument())
  expect(screen.queryByText('Christian McCaffrey')).not.toBeInTheDocument()
  // header row + at least one QB pick
  expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
})
