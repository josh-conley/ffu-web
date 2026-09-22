import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Matchups } from './Matchups'
import manifest from '../../public/data/seasons.json'
import premier2026 from '../../public/data/2026/premier.json'
import players from '../../public/data/players.json'

// The season being PLAYED: a week already banked plus the fixtures still to come. Separate from
// Matchups.test.tsx because the data provider caches by path in module scope, and that file's
// preseason test caches a 2026 with no games — vitest gives each test FILE its own module registry,
// so the two can't tread on each other here.

// 2026 as it stood after week 1: the real week-1 results, every later week still a fixture.
//
// DERIVED from the live file, never read straight out of it. The Tuesday refresh Action keeps
// filling that file in, and this test is about how an unplayed fixture renders — not about which
// week the league has actually reached. Reading the file directly made the suite fail on the first
// refresh that landed week 2 (the fixtures it asserts on had become results), which took the
// scheduled job red on data that was perfectly good.
const week1 = premier2026.games.filter((g) => g.week === 1)

/** One team's record and points after week 1 alone — the stored totals count the whole season. */
function afterWeekOne(team: (typeof premier2026.teams)[number]) {
  const game = week1.find((g) => g.participants.some((p) => p.memberId === team.memberId))
  const mine = game?.participants.find((p) => p.memberId === team.memberId)
  const theirs = game?.participants.find((p) => p.memberId !== team.memberId)
  if (mine === undefined || theirs === undefined) return team
  return {
    ...team,
    record: {
      wins: mine.score > theirs.score ? 1 : 0,
      losses: mine.score < theirs.score ? 1 : 0,
      ties: mine.score === theirs.score ? 1 : 0,
    },
    points: { for: mine.score, against: theirs.score },
  }
}

const FILES: Record<string, unknown> = {
  '/data/seasons.json': manifest,
  '/data/2026/premier.json': { ...premier2026, games: week1, teams: premier2026.teams.map(afterWeekOne) },
  // The live box score resolves names from the static player map first, hitting Sleeper's directory
  // only for ids it lacks (here: the made-up ones below).
  '/data/players.json': players,
}

// Sleeper's answers for a live box score. Owner ids are the real ones from src/config/members.ts,
// since the live path maps rosters to members through it. Week 2 is unplayed: every point is 0.
const LEAGUE = premier2026.platformLeagueId
const SLEEPER: Record<string, unknown> = {
  [`/league/${LEAGUE}/rosters`]: [
    { roster_id: 1, owner_id: '331590801261883392' }, // ffu-001, The Stallions
    { roster_id: 2, owner_id: '710981985102802944' }, // ffu-008, Frank's Little Beauties
  ],
  [`/league/${LEAGUE}`]: { roster_positions: ['QB', 'BN'] },
  [`/league/${LEAGUE}/matchups/2`]: [
    { roster_id: 1, matchup_id: 1, points: 0, starters: ['p1'], starters_points: [0], players: ['p1', 'p9'], players_points: { p1: 0, p9: 0 } },
    { roster_id: 2, matchup_id: 1, points: 0, starters: ['p2'], starters_points: [0], players: ['p2'], players_points: { p2: 0 } },
  ],
  '/state/nfl': { week: 2, season_type: 'regular', season: '2026', season_start_date: '2026-09-09' },
  '/players/nfl': { p1: { full_name: 'Live Starter', position: 'QB' }, p2: { full_name: 'Other Starter', position: 'QB' }, p9: { full_name: 'Benched', position: 'QB' } },
}

beforeEach(() => {
  vi.stubGlobal('fetch', (url: string) => {
    // Exact match: `/league/<id>` is a prefix of `/league/<id>/matchups/2`, so `includes` would
    // answer the wrong endpoint.
    const path = Object.keys(SLEEPER).find((p) => url === `https://api.sleeper.app/v1${p}`)
    if (path) return Promise.resolve({ ok: true, status: 200, json: async () => SLEEPER[path] } as Response)
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })
})
afterEach(() => vi.unstubAllGlobals())

const renderMatchups = () =>
  render(
    <MemoryRouter initialEntries={['/matchups?year=2026']}>
      <Routes>
        <Route path="matchups" element={<Matchups />} />
      </Routes>
    </MemoryRouter>,
  )

/** The week-2 block: fixtures, since only week 1 has been played. */
async function week2Section() {
  await waitFor(() => expect(screen.getAllByText('Upcoming').length).toBeGreaterThan(0))
  return screen.getByText(/^Week 2$/).closest('section') as HTMLElement
}

it('carries each team\'s current record onto a fixture that has not been played', async () => {
  renderMatchups()
  const week2 = await week2Section()
  // Week 1 went ffu-001 (The Stallions) win, ffu-043 loss — the fixtures say so rather than nothing.
  expect(within(week2).getAllByText('1-0').length).toBeGreaterThan(0)
  expect(within(week2).getAllByText('0-1').length).toBeGreaterThan(0)
  // Still no invented scores: an unplayed fixture shows em-dashes.
  expect(within(week2).queryByText('0.00')).not.toBeInTheDocument()
})

it('opens the live box score from an unplayed fixture', async () => {
  renderMatchups()
  const week2 = await week2Section()
  const [firstFixture] = within(week2).getAllByRole('button')
  firstFixture!.click()

  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('Week 2 · Live')).toBeInTheDocument()
  // The starters Sleeper reports right now, with the bench below them.
  expect(await within(dialog).findByText('Live Starter')).toBeInTheDocument()
  expect(within(dialog).getByText('Benched')).toBeInTheDocument()
  // Nothing has been played, so both sides head at 0.00 — no stale or invented score.
  expect(within(dialog).getAllByText('0.00').length).toBeGreaterThan(0)
})

it('badges the week being played Live, and the rest Upcoming', async () => {
  renderMatchups()
  const week2 = await week2Section()
  // Week 2 is in progress per Sleeper's clock; only completed weeks are written to the data files,
  // so without this it would read "Upcoming" like the weeks that genuinely haven't started.
  await waitFor(() => expect(within(week2).getByText('Live')).toBeInTheDocument())
  expect(within(week2).queryByText('Upcoming')).not.toBeInTheDocument()

  const week3 = screen.getByText(/^Week 3$/).closest('section') as HTMLElement
  expect(within(week3).getByText('Upcoming')).toBeInTheDocument()
  expect(within(week3).queryByText('Live')).not.toBeInTheDocument()
})
