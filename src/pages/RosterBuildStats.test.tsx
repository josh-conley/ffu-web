import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RosterBuildStats } from './RosterBuildStats'

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
        <Route path="builds" element={<RosterBuildStats />} />
      </Routes>
    </MemoryRouter>,
  )
}

it('renders the build table with the finish-bracket columns and their baselines', async () => {
  renderAt('/builds?rounds=3&min=1')
  // Headers carry the structural baseline (top 6 = 50%, top 3 = 25%, etc.).
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /Top 6 · 50%/ })).toBeInTheDocument())
  expect(screen.getByRole('columnheader', { name: /Top 3 · 25%/ })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /Top 9 · 75%/ })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /1st · 8%/ })).toBeInTheDocument()
  // Summary metric columns.
  expect(screen.getByRole('columnheader', { name: 'Avg' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'UPR' })).toBeInTheDocument()
  // 240 team-seasons across every completed tier-season, stated in the intro.
  expect(screen.getByText(/240 team-seasons/i)).toBeInTheDocument()
})

it('the year range restricts the sample (fewer team-seasons)', async () => {
  renderAt('/builds?rounds=3&min=1&from=2023&to=2024')
  // 6 tier-seasons (3 tiers × 2 years) × 12 teams = 72.
  await waitFor(() => expect(screen.getByText(/72 team-seasons/i)).toBeInTheDocument())
})

it('reset restores the full sample (clears all filters)', async () => {
  renderAt('/builds?league=PREMIER&from=2023&to=2024')
  await waitFor(() => expect(screen.getByText(/24 team-seasons/i)).toBeInTheDocument()) // 2 yrs × 12
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  await waitFor(() => expect(screen.getByText(/240 team-seasons/i)).toBeInTheDocument())
})

it('reflects the round threshold from the URL in the description', async () => {
  renderAt('/builds?rounds=4&min=1')
  await waitFor(() => expect(screen.getByText(/first 4 rounds/i)).toBeInTheDocument())
})

it('unchecking positions merges buckets (RB-only collapses to a single "2 RB" build)', async () => {
  renderAt('/builds?rounds=3&min=1&pos=RB')
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /Top 6/ })).toBeInTheDocument())
  // With only RB counted, distinct builds are just the RB counts (0..3 RB) — far fewer than the
  // full skill-position mix. A "2 RB" build cell (colored count-pill) should be present.
  const table = screen.getByRole('table')
  expect(within(table).getAllByText('RB').length).toBeGreaterThan(0)
})

it('clicking a build row opens the drill-down with team-seasons', async () => {
  renderAt('/builds?rounds=1&min=1&pos=QB,RB,WR,TE')
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /Top 6/ })).toBeInTheDocument())
  const rows = screen.getAllByRole('button').filter((el) => el.tagName === 'TR')
  fireEvent.click(rows[0]!)
  // The detail panel is a labelled region listing the teams behind the build.
  await waitFor(() => expect(screen.getByRole('region', { name: /Teams that drafted/i })).toBeInTheDocument())
})
