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
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /Avg UPR/ })).toBeInTheDocument())
  // The expanded Career-Statistics columns ported from the old site are present.
  for (const header of ['Playoff Rec', 'Point Diff', 'Avg PPG', 'High Game', 'Titles', '2nd', '3rd', 'Last', 'Tiers', 'Avg Rank', 'Lineup Eff', 'Bench Pts Lost']) {
    expect(screen.getByRole('columnheader', { name: new RegExp(header) })).toBeInTheDocument()
  }
  // 61 members who have played + header (ffu-035 ZBoser & ffu-048 dewdoc never appear in data).
  expect(screen.getAllByRole('row').length).toBe(62)
  // Efficiency values render as percentages for Sleeper-era members.
  expect(screen.getAllByText(/^\d{2}\.\d%$/).length).toBeGreaterThan(0)
})
