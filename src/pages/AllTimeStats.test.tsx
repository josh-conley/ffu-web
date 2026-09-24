import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { getMember } from '@/config'
import type { SeasonData } from '@/data'
import { hasBeenPlayed } from '@/selectors'
import { AllTimeStats } from './AllTimeStats'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

// Everyone who has played at least one game. Derived from the files rather than hard-coded: the
// season in progress adds its first-time members the week they play, so a fixed count goes stale
// every September (ffu-035 ZBoser & ffu-048 dewdoc are registered but never appear in data).
const SEASON_FILE = /^\/data\/\d{4}\/(premier|masters|national)\.json$/
const playedMembers = new Set(
  Object.entries(FILES)
    .filter(([path]) => SEASON_FILE.test(path))
    .map(([, season]) => season as SeasonData)
    .filter(hasBeenPlayed)
    .flatMap((season) => season.teams.map((t) => t.memberId)),
)

afterEach(() => vi.unstubAllGlobals())

function stubFetch() {
  vi.stubGlobal('fetch', (url: string) => {
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })
}

it('keeps a current member under Active only when scoped to a league they no longer play in', async () => {
  // A member playing outside Premier in the latest season who has Premier seasons behind them.
  // Derived, so it holds whatever the data: relegation guarantees one every year.
  const played = Object.entries(FILES)
    .filter(([path]) => SEASON_FILE.test(path))
    .map(([, season]) => season as SeasonData)
    .filter(hasBeenPlayed)
  const latest = Math.max(...played.map((s) => Number(s.year)))
  const everPremier = new Set(played.filter((s) => s.tier === 'PREMIER').flatMap((s) => s.teams.map((t) => t.memberId)))
  const relegated = played
    .filter((s) => Number(s.year) === latest && s.tier !== 'PREMIER')
    .flatMap((s) => s.teams.map((t) => t.memberId))
    .find((id) => everPremier.has(id))
  expect(relegated).toBeDefined()

  stubFetch()
  render(
    <MemoryRouter initialEntries={['/stats?league=PREMIER&active=1']}>
      <AllTimeStats />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /Avg UPR/ })).toBeInTheDocument())
  expect(screen.getByText(getMember(relegated!)!.name)).toBeInTheDocument()
})

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
  for (const header of ['Playoff Rec', 'Point Diff', 'Avg PPG', 'High Game', '1st', '2nd', '3rd', 'Div', 'Last', 'Tiers', 'Avg Rank', 'Lineup Eff']) {
    expect(screen.getByRole('columnheader', { name: new RegExp(header) })).toBeInTheDocument()
  }
  // One row per member who has played, plus the header.
  expect(playedMembers.size).toBeGreaterThanOrEqual(61)
  expect(screen.getAllByRole('row').length).toBe(playedMembers.size + 1)
  // Efficiency values render as percentages for Sleeper-era members.
  expect(screen.getAllByText(/^\d{2}\.\d%$/).length).toBeGreaterThan(0)
})
