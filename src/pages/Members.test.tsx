import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Tier } from '@/config'
import { LIVE_LEAGUE_IDS } from '@/config'
import { Members } from './Members'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) {
  FILES[path.replace('../../public', '')] = mod
}

/** `sleeper` answers any URL it recognises (Sleeper's API); everything else is the static data. */
function renderAt(path: string, sleeper: (url: string) => unknown = () => undefined) {
  vi.stubGlobal('fetch', (url: string) => {
    const body = sleeper(url) ?? FILES[url]
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

// Sleeper unanswered: the directory falls back to one plain grid per tier off last season's finishes.
it('lists members grouped by league with a past-members section', async () => {
  renderAt('/members')
  await waitFor(() => expect(screen.getByText('The Minutemen')).toBeInTheDocument())
  // league section headings (current leagues) + the past-members section
  expect(screen.getByRole('heading', { name: 'Premier' })).toBeInTheDocument()
  expect(screen.getByText('Past Members')).toBeInTheDocument()
})

// Sleeper's live roster read for the season. Answers any league rosters call (the ids come from
// LIVE_LEAGUE_IDS); assumes a season is configured there — if it ever isn't, the directory is on its
// tier-grid fallback and these assertions should be retired with the leagues cards.
it("lists the season's leagues with how each member got there, and opens a member", async () => {
  const ROSTERS: Record<string, { roster_id: number; owner_id: string | null }[]> = {
    // ffu-037 (Head Cow) was Masters in 2025 -> promoted; ffu-023 (Minutemen) was already Premier.
    PREMIER: [
      { roster_id: 1, owner_id: '865323291064291328' },
      { roster_id: 2, owner_id: '84006772809285632' },
      { roster_id: 3, owner_id: null }, // an unfilled slot
    ],
    // ffu-057 (YAC Attack) is a first-time member; ffu-012 dropped from Masters.
    NATIONAL: [
      { roster_id: 1, owner_id: '1380233141997809664' },
      { roster_id: 2, owner_id: '860973514839199744' },
    ],
  }
  const ids = Object.values(LIVE_LEAGUE_IDS).at(-1) as Record<Tier, string>
  renderAt('/members', (url) => {
    if (url.includes(ids.PREMIER)) return ROSTERS.PREMIER
    if (url.includes(ids.NATIONAL)) return ROSTERS.NATIONAL
    if (url.includes('/rosters')) return []
    return undefined
  })

  await waitFor(() => expect(screen.getByText(/^20\d\d Leagues$/)).toBeInTheDocument())
  expect(screen.getByText('Head Cow Always Grazing')).toBeInTheDocument()
  expect(screen.getByText('Tyler')).toBeInTheDocument() // the owner's name rides along with the team
  expect(screen.getByText('Promoted')).toBeInTheDocument()
  expect(screen.getByText('Relegated')).toBeInTheDocument()
  expect(screen.getByText('New')).toBeInTheDocument()
  expect(screen.getByText(/1 pending member/)).toBeInTheDocument()
  expect(screen.getByText('Past Members')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /The Minutemen/ }))
  await waitFor(() => expect(screen.getByRole('heading', { name: 'The Minutemen' })).toBeInTheDocument())
})

it('shows a member detail with derived debut year + owner', async () => {
  renderAt('/members?member=ffu-023')
  // Header heading (not the directory link)
  await waitFor(() => expect(screen.getByRole('heading', { name: 'The Minutemen' })).toBeInTheDocument())
  // The page's fixed structure, in order.
  const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
  expect(sections).toEqual(['Career', 'Rivals', 'Franchise Players', 'Up / Down History', 'Milestones'])
  // The Minutemen have played every season, so their tenure runs to the newest one with games —
  // derived, because the season in progress joins it the week its first games land.
  const manifest = FILES['/data/seasons.json'] as { seasons: { year: string; hasGames?: boolean }[] }
  const lastYear = Math.max(...manifest.seasons.filter((s) => s.hasGames !== false).map((s) => Number(s.year)))
  expect(screen.getByText(new RegExp(`Josh · 2018–${lastYear}`))).toBeInTheDocument() // owner (first-name only) + derived tenure
  expect(screen.getByText(new RegExp(`2018–${lastYear} · ${lastYear - 2017} seasons`))).toBeInTheDocument() // derived tenure
})

it('shows a head-to-head comparison when ?vs is set', async () => {
  renderAt('/members?member=ffu-023&vs=ffu-009')
  await waitFor(() => expect(screen.getByText('Head-to-Head')).toBeInTheDocument())
  expect(screen.getByText('Championships')).toBeInTheDocument() // career compare row
})

it("lists a member's rivals with a plain Compare link and no win% column", async () => {
  renderAt('/members?member=ffu-023')
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Rivals' })).toBeInTheDocument())
  const table = screen.getAllByRole('table')[1] as HTMLElement
  const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent?.replace(/[▲▼]/g, ''))
  expect(headers.slice(0, 6)).toEqual(['Opponent', 'GP', 'W-L', 'PF', 'PA', 'Last Met'])
  expect(headers.some((h) => /%/.test(h ?? ''))).toBe(false)
  const compare = within(table).getAllByRole('link', { name: /^Compare with / })[0]
  expect(compare).toHaveAttribute('href', expect.stringMatching(/^\/members\?member=ffu-023&vs=ffu-/))
})
