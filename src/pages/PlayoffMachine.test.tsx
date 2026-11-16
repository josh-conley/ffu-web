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
    .map((row) => within(row).getAllByRole('cell')[1]!.textContent ?? '')
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
