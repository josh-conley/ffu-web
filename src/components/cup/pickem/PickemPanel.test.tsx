import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { PickemBoard } from '@/data'
import { drawnCup } from '@/test/drawnCup'
import { EMPTY_PICKS, pickBracket, setDrop, setWinner, type CupPicks } from '@/lib/cupPickem'
import { resolveTournament } from '@/selectors'
import { PickemPanel } from './PickemPanel'

const api = vi.hoisted(() => ({ board: vi.fn(), save: vi.fn(), load: vi.fn() }))
vi.mock('@/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data')>()),
  fetchPickemBoard: api.board,
  savePickemEntry: api.save,
  loadPickemEntry: api.load,
}))

/** Every game to the first-listed team; the first Round of 18 winner dropped. */
function firstListed(): CupPicks {
  let picks = EMPTY_PICKS
  for (const round of drawnCup.rounds) {
    pickBracket(drawnCup, picks).find((r) => r.key === round.key)!.slots.forEach((s, j) => (picks = setWinner(drawnCup, picks, round.key, j, s.a!)))
    const r = pickBracket(drawnCup, picks).find((x) => x.key === round.key)!
    if (r.needsDrop) picks = setDrop(drawnCup, picks, round.key, r.slots[0]!.pick!)
  }
  return picks
}

const team = drawnCup.participants[0]!.ffuId
const board = (over: Partial<PickemBoard>): PickemBoard => ({ locksAt: drawnCup.pickemLocksAt, open: true, locked: false, entries: [], ...over })

function renderPanel() {
  return render(
    <MemoryRouter>
      <PickemPanel tournament={drawnCup} played={resolveTournament(drawnCup, {})} year="2026" />
    </MemoryRouter>,
  )
}

afterEach(() => vi.clearAllMocks())

it('loads a saved bracket with its PIN and saves the changes', async () => {
  const picks = firstListed()
  api.board.mockResolvedValue(board({ entries: [{ ffuId: team, updatedAt: '2026-10-14T00:00:00Z' }] }))
  api.load.mockResolvedValue(picks)
  api.save.mockResolvedValue(undefined)
  renderPanel()

  expect(await screen.findByText(/of 36 teams in/)).toBeInTheDocument()
  const submit = screen.getByRole('button', { name: 'Submit bracket' })
  expect(submit).toBeDisabled()

  await userEvent.selectOptions(screen.getByLabelText('Your team'), team)
  await userEvent.type(screen.getByLabelText(/PIN/), '4821')
  await userEvent.click(screen.getByRole('button', { name: 'Load my saved bracket' }))
  expect(api.load).toHaveBeenCalledWith('2026', team, '4821')

  const save = await screen.findByRole('button', { name: 'Save changes' })
  expect(save).toBeEnabled()
  await userEvent.click(save)
  expect(api.save).toHaveBeenCalledWith('2026', team, '4821', picks)
  expect(await screen.findAllByText(/^Saved\./)).not.toHaveLength(0)
  // The board is read again so the entry list is current.
  expect(api.board).toHaveBeenCalledTimes(2)
})

it('fills a game by tapping the winner', async () => {
  api.board.mockResolvedValue(board({}))
  renderPanel()
  const first = (await screen.findAllByRole('listitem'))[0]!
  const [a] = within(first).getAllByRole('button')
  await userEvent.click(a!)
  expect(a).toHaveAttribute('aria-pressed', 'true')
})

it('shows the leaderboard with everyone\'s picks once locked', async () => {
  api.board.mockResolvedValue(board({ open: false, locked: true, entries: [{ ffuId: team, updatedAt: 'x', picks: firstListed() }] }))
  renderPanel()
  expect(await screen.findByRole('table')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Submit/ })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Bracket' }))
  expect(screen.getByText(/'s bracket$/)).toBeInTheDocument()
})
