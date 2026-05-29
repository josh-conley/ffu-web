import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Members } from './Members'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) {
  FILES[path.replace('../../public', '')] = mod
}

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
        <Route path="members" element={<Members />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => vi.unstubAllGlobals())

it('lists members in the directory', async () => {
  renderAt('/members')
  await waitFor(() => expect(screen.getByText('The Minutemen')).toBeInTheDocument())
  expect(screen.getByRole('columnheader', { name: /Titles/ })).toBeInTheDocument()
})

it('shows a member detail with derived debut year + owner', async () => {
  renderAt('/members?member=ffu-023')
  // Header heading (not the directory link)
  await waitFor(() => expect(screen.getByRole('heading', { name: 'The Minutemen' })).toBeInTheDocument())
  expect(screen.getByText('Season History')).toBeInTheDocument()
  expect(screen.getByText(/Josh · 2018–2025/)).toBeInTheDocument() // owner (first-name only) + derived tenure
  expect(screen.getByText(/2018–2025 · 8 seasons/)).toBeInTheDocument() // derived tenure
})

it('shows a head-to-head comparison when ?vs is set', async () => {
  renderAt('/members?member=ffu-023&vs=ffu-009')
  await waitFor(() => expect(screen.getByText('Head-to-Head')).toBeInTheDocument())
  expect(screen.getByText('Championships')).toBeInTheDocument() // career compare row
})
