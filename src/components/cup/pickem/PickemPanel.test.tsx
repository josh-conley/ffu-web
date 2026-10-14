import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { PickemBoard } from '@/data'
import { drawnCup, seedOf } from '@/test/drawnCup'
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
      <PickemPanel tournament={drawnCup} played={resolveTournament(drawnCup, {})} seasons={[]} year="2026" />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

it('saves a complete bracket for the member chosen, with their PIN, and remembers it in this browser', async () => {
  const picks = firstListed()
  window.localStorage.setItem('ffu-pickem-draft-2026', JSON.stringify({ ffuId: '', picks }))
  api.board.mockResolvedValue(board({ entries: [{ ffuId: team, updatedAt: '2026-10-14T00:00:00Z' }] }))
  api.save.mockResolvedValue(undefined)
  renderPanel()

  expect(await screen.findByText(/of 36 teams in/)).toBeInTheDocument()
  // The draft came back complete, but nobody is chosen yet: Submit says so and moves there.
  expect(screen.getByText(/Bracket done\. Now choose who you are/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Submit bracket/ }))
  expect(api.save).not.toHaveBeenCalled()
  expect(screen.getAllByText(/Choose who you are first/).length).toBeGreaterThan(0)
  expect(screen.getByLabelText('Who are you?')).toHaveFocus()
  await userEvent.selectOptions(screen.getByLabelText('Who are you?'), team)
  expect(screen.getByText(/Enter your PIN to load your bracket here/)).toBeInTheDocument()
  // Nor without a PIN.
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(api.save).not.toHaveBeenCalled()
  expect(screen.getAllByText(/Enter a PIN of 4 to 8 digits/).length).toBeGreaterThan(0)
  await userEvent.type(screen.getByLabelText(/PIN/), '48a21')
  expect(screen.getByLabelText(/PIN/)).toHaveValue('4821')
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(api.save).toHaveBeenCalledWith('2026', team, '4821', picks)
  expect(await screen.findAllByText(/^Saved\./)).not.toHaveLength(0)
  // The board is read again so the entry list is current.
  expect(api.board).toHaveBeenCalledTimes(2)
  // The draft is remembered; the PIN never is.
  expect(JSON.parse(window.localStorage.getItem('ffu-pickem-draft-2026')!)).toEqual({ ffuId: team, picks })
})

it('loads a member\'s saved bracket with their PIN, say on another device', async () => {
  const picks = firstListed()
  api.board.mockResolvedValue(board({ entries: [{ ffuId: team, updatedAt: '2026-10-14T00:00:00Z' }] }))
  api.load.mockResolvedValue(picks)
  renderPanel()

  await userEvent.selectOptions(await screen.findByLabelText('Who are you?'), team)
  const load = screen.getByRole('button', { name: 'Load my saved bracket' })
  expect(load).toBeDisabled()
  await userEvent.type(screen.getByLabelText(/PIN/), '4821')
  await userEvent.click(load)
  expect(api.load).toHaveBeenCalledWith('2026', team, '4821')
  expect(await screen.findByText(/Your saved bracket is loaded/)).toBeInTheDocument()
  expect(JSON.parse(window.localStorage.getItem('ffu-pickem-draft-2026')!).picks).toEqual(picks)
})

it('opens a matchup and picks from its modal', async () => {
  api.board.mockResolvedValue(board({}))
  renderPanel()
  const [a, b] = [drawnCup.rounds[0]!.matchups![0]!.a, drawnCup.rounds[0]!.matchups![0]!.b]
  await userEvent.click(await screen.findByRole('button', { name: `${a} v ${b}` }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('No games on file this season yet.')).toBeInTheDocument()
  // Both teams' draw seeds, as on every Cup matchup.
  expect(within(dialog).getByText(`#${seedOf.get(a)}`)).toBeInTheDocument()
  expect(within(dialog).getByText(`#${seedOf.get(b)}`)).toBeInTheDocument()
  // Lineups for the round's own week, never just the latest week on file.
  expect(within(dialog).getByRole('heading', { name: `Week ${drawnCup.rounds[0]!.week} lineups` })).toBeInTheDocument()
  await userEvent.click(within(dialog).getByRole('button', { name: `Pick ${a}` }))
  // Picking closes the modal; reopening shows the pick.
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: `${a} v ${b}` }))
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Your pick' })).toHaveAttribute('aria-pressed', 'true')
})

it('brings the drop pick into focus the moment the last Round of 18 winner is picked', async () => {
  // A remembered draft one pick short: every Round of 18 game but the last, no drop yet.
  const full = firstListed()
  const r18 = [...full.winners.r18!]
  const last = r18.length - 1
  r18[last] = null
  const draft = { winners: { r36: full.winners.r36 }, drops: {} }
  window.localStorage.setItem('ffu-pickem-draft-2026', JSON.stringify({ ffuId: '', picks: { ...draft, winners: { ...draft.winners, r18 } } }))
  api.board.mockResolvedValue(board({}))
  renderPanel()
  await screen.findByText(/of 36 teams in/)
  // Already owing nothing but one pick: the drop isn't asked for yet, and nothing is focused.
  expect(screen.queryByText('Required')).not.toBeInTheDocument()

  const slot = pickBracket(drawnCup, { winners: { r36: full.winners.r36!, r18 }, drops: {} }).find((r) => r.key === 'r18')!.slots[last]!
  await userEvent.click(screen.getByRole('button', { name: `${slot.a} v ${slot.b}` }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: `Pick ${slot.a}` }))

  expect(screen.getByText('Required')).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: /Pick the team to drop/ })).toHaveFocus()
  expect(screen.getByText(/^Next: pick which Round of 18 winner is dropped/)).toBeInTheDocument()
})

it('shows the leaderboard with everyone\'s picks once locked', async () => {
  api.board.mockResolvedValue(board({ open: false, locked: true, entries: [{ ffuId: team, updatedAt: 'x', picks: firstListed() }] }))
  renderPanel()
  expect(await screen.findByRole('table')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Submit/ })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Bracket' }))
  expect(screen.getByText(/'s bracket$/)).toBeInTheDocument()
})
