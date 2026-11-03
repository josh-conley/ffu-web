import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { UprExplorer } from './UprExplorer'

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
        <Route path="upr-explorer" element={<UprExplorer />} />
      </Routes>
    </MemoryRouter>,
  )
}

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]!).getAllByRole('row')
/** The UPR column's values, top to bottom. */
const uprs = () => bodyRows().map((r) => Number(within(r).getAllByRole('cell')[3]!.textContent))

it('ranks team-seasons by UPR, highest first, with the ingredient columns', async () => {
  renderAt('/upr-explorer?to=2025')
  await waitFor(() => expect(screen.getByRole('columnheader', { name: 'Avg' })).toBeInTheDocument())
  for (const name of ['UPR', 'Record', 'High', 'Low', 'Win%']) expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
  const values = uprs()
  expect(values).toEqual([...values].sort((a, b) => b - a))
  // 2018–2025: 2 leagues a year through 2021, 3 from 2022, 12 teams each = 20 × 12.
  expect(screen.getByText('240')).toBeInTheDocument()
})

it('flips to lowest first', async () => {
  renderAt('/upr-explorer?to=2025&order=low')
  await waitFor(() => expect(bodyRows().length).toBeGreaterThan(1))
  const values = uprs()
  expect(values).toEqual([...values].sort((a, b) => a - b))
})

it('a member filter keeps only their seasons, at their place in the full ranking', async () => {
  renderAt('/upr-explorer?to=2025&league=PREMIER&member=ffu-001')
  await waitFor(() => expect(bodyRows().length).toBeGreaterThan(0))
  const rows = bodyRows()
  // The count says how many rows there are, and how many they're ranked among.
  expect(screen.getByText(new RegExp(`^${rows.length} of \\d+$`))).toBeInTheDocument()
  expect(rows.length).toBeLessThanOrEqual(8) // one Premier season a year at most, 2018–2025
  // Ranks are among all Premier team-seasons, so they aren't simply 1, 2, 3, ...
  expect(rows.some((r, i) => !within(r).getAllByRole('cell')[0]!.textContent?.startsWith(String(i + 1)))).toBe(true)
})

it('never rates a week before UPR exists: a URL asking for one is held at week 3', async () => {
  renderAt('/upr-explorer?to=2025&week=1')
  await waitFor(() => expect(screen.getByRole('slider', { name: 'Through week' })).toHaveValue('3'))
  expect(screen.getByRole('slider', { name: 'Through week' })).toHaveAttribute('min', '3')
  expect(bodyRows().length).toBeGreaterThan(1)
})

// The newest season on file, and whether its regular season is still being played (the callout
// only exists then; read from the data so the test still holds once the season is over).
const latestYear = Object.keys(FILES).map((p) => /^\/data\/(\d{4})\/premier\.json$/.exec(p)?.[1]).filter(Boolean).sort().at(-1)
const latest = FILES[`/data/${latestYear}/premier.json`] as { games: { week: number; isPlayoff: boolean }[] }
const inProgress = !latest.games.some((g) => g.isPlayoff) && Math.max(0, ...latest.games.map((g) => g.week)) < 14

it.runIf(inProgress)('offers to rank the season in progress only while the chosen week leaves it out', async () => {
  renderAt('/upr-explorer')
  const button = await screen.findByRole('button', { name: new RegExp(`^Show ${latestYear} \\(through week \\d+\\)$`) })
  fireEvent.click(button)
  await waitFor(() => expect(screen.getAllByText('Live').length).toBeGreaterThan(0))
  // Once the table includes it, there's nothing left to offer.
  expect(screen.queryByRole('button', { name: /^Show / })).not.toBeInTheDocument()
})
