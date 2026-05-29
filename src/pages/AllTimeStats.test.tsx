import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AllTimeStats } from './AllTimeStats'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

afterEach(() => vi.unstubAllGlobals())

it('renders the all-time leaderboard with a Career UPR column', async () => {
  vi.stubGlobal('fetch', (url: string) => {
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })

  render(
    <MemoryRouter>
      <AllTimeStats />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /Career UPR/ })).toBeInTheDocument())
  // 61 members who have played + header (ffu-035 ZBoser & ffu-048 dewdoc never appear in data).
  expect(screen.getAllByRole('row').length).toBe(62)
})
