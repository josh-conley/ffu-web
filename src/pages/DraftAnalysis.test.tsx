import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DraftAnalysis } from './DraftAnalysis'

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
        <Route path="draft-analysis" element={<DraftAnalysis />} />
      </Routes>
    </MemoryRouter>,
  )
}

it('renders the build table with a baseline and playoff-rate columns', async () => {
  renderAt('/draft-analysis?rounds=3&min=1')
  await waitFor(() => expect(screen.getByRole('columnheader', { name: 'Playoff Rate' })).toBeInTheDocument())
  // 6-of-12 make the playoffs every season → the pooled baseline is exactly 50%.
  expect(screen.getByText('Baseline rate').nextSibling).toHaveTextContent('50%')
})

it('reflects the round threshold from the URL in the description', async () => {
  renderAt('/draft-analysis?rounds=4&min=1')
  await waitFor(() => expect(screen.getByText(/first 4 rounds/i)).toBeInTheDocument())
})
