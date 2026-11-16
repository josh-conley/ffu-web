import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { nameForYear } from '@/config'
import { PlayoffMachine } from './PlayoffMachine'

// A small made-up live season, so the weekly data refresh can't move these assertions: two
// divisions of two, week 1 played, week 2 still to play. The page reads the live year (2026).
const team = (memberId: string, divisionId: number) => ({
  memberId,
  divisionId,
  record: { wins: 0, losses: 0, ties: 0 },
  points: { for: 0, against: 0 },
  promoted: false,
  relegated: false,
})
const SEASON = {
  schemaVersion: 1,
  tier: 'PREMIER',
  year: '2026',
  era: 'sleeper',
  platformLeagueId: 'x',
  divisions: [
    { id: 1, name: 'Diamond' },
    { id: 2, name: 'Gold' },
  ],
  teams: [team('ffu-001', 1), team('ffu-008', 1), team('ffu-023', 2), team('ffu-026', 2)],
  games: [
    { week: 1, isPlayoff: false, participants: [{ memberId: 'ffu-001', score: 120 }, { memberId: 'ffu-008', score: 100 }] },
    { week: 1, isPlayoff: false, participants: [{ memberId: 'ffu-023', score: 90 }, { memberId: 'ffu-026', score: 80 }] },
  ],
  schedule: [
    { week: 1, memberIds: ['ffu-001', 'ffu-008'] },
    { week: 1, memberIds: ['ffu-023', 'ffu-026'] },
    { week: 2, memberIds: ['ffu-008', 'ffu-001'] },
    { week: 2, memberIds: ['ffu-026', 'ffu-023'] },
  ],
}

const name = (id: string) => nameForYear(id, '2026') ?? id
const TEAMS = SEASON.teams.map((t) => name(t.memberId))

afterEach(() => vi.unstubAllGlobals())

function renderMachine() {
  vi.stubGlobal('fetch', (url: string) =>
    Promise.resolve(
      url === '/data/2026/premier.json'
        ? ({ ok: true, status: 200, json: async () => SEASON } as Response)
        : ({ ok: false, status: 404, json: async () => ({}) } as Response),
    ),
  )
  return render(
    <MemoryRouter initialEntries={['/playoff-machine']}>
      <Routes>
        <Route path="playoff-machine" element={<PlayoffMachine />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Team names down the seeds table, seed 1 first. */
function seedOrder(): string[] {
  const table = screen.getByRole('table')
  return within(table)
    .getAllByRole('row')
    .slice(1)
    // The cell also holds a clinch label and, on a phone, the division: match on the team names.
    .map((row) => TEAMS.find((team) => within(row).getAllByRole('cell')[1]!.textContent?.includes(team)) ?? '')
}

it('shows the current seeding, then re-seeds as winners are picked and un-picked', async () => {
  const user = userEvent.setup()
  renderMachine()
  await waitFor(() => expect(screen.getByText('Seeds as it stands')).toBeInTheDocument())
  expect(screen.getByText(/0 of 2 picked/)).toBeInTheDocument()
  // Division winners first: ffu-001 (beat ffu-008) and ffu-023 (beat ffu-026).
  expect(seedOrder().slice(0, 2)).toEqual([name('ffu-001'), name('ffu-023')])

  // ffu-008 wins the rematch: level with ffu-001 at 1-1, split head to head, ffu-001 has more points.
  const week2 = screen.getByRole('region', { name: 'Week 2' })
  const pick = within(week2).getAllByRole('button', { name: name('ffu-008') })[0]!
  await user.click(pick)
  expect(pick).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('Projected seeds')).toBeInTheDocument()
  expect(screen.getByText(/1 of 2 picked/)).toBeInTheDocument()
  expect(seedOrder()[0]).toBe(name('ffu-023'))

  await user.click(pick)
  expect(pick).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByText(/0 of 2 picked/)).toBeInTheDocument()
})

it('clears every pick at once', async () => {
  const user = userEvent.setup()
  renderMachine()
  await waitFor(() => expect(screen.getByText('Seeds as it stands')).toBeInTheDocument())
  await user.click(screen.getAllByRole('button', { name: name('ffu-026') })[0]!)
  await user.click(screen.getByRole('button', { name: 'Clear picks' }))
  expect(screen.getByText(/0 of 2 picked/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Clear picks' })).not.toBeInTheDocument()
})

it('explains a tiebreak in a popup naming the tied teams', async () => {
  const user = userEvent.setup()
  renderMachine()
  await waitFor(() => expect(screen.getByText('Seeds as it stands')).toBeInTheDocument())
  // ffu-008 wins the rematch: level with ffu-001 at 1-1 for the Diamond title, split head to head.
  await user.click(within(screen.getByRole('region', { name: 'Week 2' })).getAllByRole('button', { name: name('ffu-008') })[0]!)
  const chip = screen.getByRole('button', { name: `How ${name('ffu-001')}'s tie was broken` })
  expect(chip).toHaveTextContent('PF')
  await user.click(chip)
  expect(chip).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('Level at 1-1 for the Diamond title')).toBeInTheDocument()
  expect(screen.getByText('Head to head was level, so points for decided.')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(chip).toHaveAttribute('aria-expanded', 'false')
})

it('shows each division on its own, and the division under each team in the picker', async () => {
  const user = userEvent.setup()
  renderMachine()
  await waitFor(() => expect(screen.getByText('Seeds as it stands')).toBeInTheDocument())
  expect(within(screen.getByRole('region', { name: 'Week 2' })).getAllByText('Gold')).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: 'By division' }))
  expect(screen.getByRole('region', { name: 'Diamond division' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Gold division' })).toBeInTheDocument()
  expect(screen.getAllByRole('table')).toHaveLength(2)
})

it('marks a clinch once the picks make it certain', async () => {
  const user = userEvent.setup()
  renderMachine()
  await waitFor(() => expect(screen.getByText('Seeds as it stands')).toBeInTheDocument())
  expect(screen.queryByText(/Clinched a first-round bye/)).not.toBeInTheDocument()
  // ffu-001 sweeps ffu-008 (2-0 v 0-2), and only one other division's winner can reach 2 wins.
  await user.click(within(screen.getByRole('region', { name: 'Week 2' })).getAllByRole('button', { name: name('ffu-001') })[0]!)
  const row = screen.getAllByRole('row').find((r) => r.textContent?.includes(name('ffu-001')))!
  expect(within(row).getByText('Clinched a first-round bye:')).toBeInTheDocument()
  expect(screen.getByText(/Clinches count your picks as played/)).toBeInTheDocument()
})

it('on a phone, shows the playoff field above the games and opens the seeds from it', async () => {
  const user = userEvent.setup()
  renderMachine()
  await waitFor(() => expect(screen.getByText('Seeds as it stands')).toBeInTheDocument())
  const games = screen.getByRole('button', { name: 'Pick games' })
  expect(games).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: new RegExp(`^Playoff field: 1 ${name('ffu-001')}`) }))
  expect(screen.getByRole('button', { name: 'Seeds' })).toHaveAttribute('aria-pressed', 'true')
  // The switch counts picks, so the games tab says how many are in play.
  await user.click(games)
  await user.click(within(screen.getByRole('region', { name: 'Week 2' })).getAllByRole('button', { name: name('ffu-026') })[0]!)
  expect(screen.getByRole('button', { name: 'Pick games (1)' })).toBeInTheDocument()
})
