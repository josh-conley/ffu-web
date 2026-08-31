import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Drafts } from './Drafts'

// The live season's board comes from Sleeper, not public/data — so stub both: the manifest off disk
// and the Sleeper draft endpoint with a realistic pre-draft payload (order set, zero picks).
const modules = import.meta.glob('../../public/data/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

// Real 2026 Sleeper account ids for six Premier managers, so they resolve through members.ts.
const PREMIER_ORDER: Record<string, number> = {
  '467404039059927040': 1, // Malibu Leopards
  '470715135581745152': 2, // Pottsville Maroons
  '705642514408886272': 3, // Dark Knights
  '710981985102802944': 4, // Frank's Little Beauties
  '727368657923063808': 5, // Fort Wayne Banana Bread
  'not-a-registered-user': 6,
}

/** Mutable: tests flip `status` to simulate the commissioner starting the draft. */
const DRAFT = {
  draft_id: 'd1',
  start_time: 1788804046000,
  status: 'pre_draft',
  created: 1,
  draft_order: PREMIER_ORDER,
  settings: { rounds: 3 },
}

/** Picks the fake Sleeper hands back; tests push onto it to simulate the draft running. */
let livePicks: unknown[] = []
const pick = (overall: number, round: number, slot: number, by: string, first: string, last: string) => ({
  pick_no: overall,
  round,
  draft_slot: slot,
  player_id: `p${overall}`,
  picked_by: by,
  metadata: { first_name: first, last_name: last, position: 'RB', team: 'CIN' },
})

beforeEach(() => {
  livePicks = []
  DRAFT.status = 'pre_draft'
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const body = url.includes('/picks') ? livePicks : url.includes('/drafts') ? [DRAFT] : FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  }))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

async function renderDrafts(search = '?year=2026&tier=PREMIER') {
  render(
    <MemoryRouter initialEntries={[`/drafts${search}`]}>
      <Routes>
        <Route path="drafts" element={<Drafts />} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Drafts' })).toBeInTheDocument())
}

it('shows the live season as a real board with every slot and pick coordinate', async () => {
  await renderDrafts()

  await waitFor(() => expect(screen.getByText(/3 rounds · snake/)).toBeInTheDocument())

  // The board, not a summary table: a round rail and one column per drafter.
  expect(screen.getByText('Rd')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Malibu Leopards/ })).toBeInTheDocument()

  // Snake coordinates: slot 1 owns 1.01/#1 and then the last pick of round 2.
  expect(screen.getByText('1.01')).toBeInTheDocument()
  expect(screen.getByText('#1')).toBeInTheDocument()
  // 6 slots over 3 rounds = 18 cells, so every overall number 1..18 appears exactly once.
  for (let overall = 1; overall <= 18; overall++) {
    expect(screen.getAllByText(`#${overall}`)).toHaveLength(1)
  }

  // An unmapped Sleeper account keeps its slot rather than punching a hole in the order.
  expect(screen.getByText(/1 manager not listed yet/)).toBeInTheDocument()
})

it('hides the Board/List toggle for the live season (there are no picks to list)', async () => {
  await renderDrafts()
  await waitFor(() => expect(screen.getByText(/3 rounds · snake/)).toBeInTheDocument())
  expect(screen.queryByRole('button', { name: 'List' })).not.toBeInTheDocument()
})

it('spotlights one drafter’s picks when their nameplate is clicked', async () => {
  await renderDrafts()
  await waitFor(() => expect(screen.getByText(/3 rounds · snake/)).toBeInTheDocument())

  const nameplate = screen.getByRole('button', { name: /Malibu Leopards/ })
  await userEvent.click(nameplate)
  expect(nameplate).toHaveAttribute('aria-pressed', 'true')
})

it('lands on the live season by default, since it is the topical one', async () => {
  // No ?year= — the picker offers the live year alongside the manifest, newest first.
  await renderDrafts('')
  await waitFor(() => expect(screen.getByText(/3 rounds · snake/)).toBeInTheDocument())
  expect(screen.getByRole('combobox', { name: /season/i })).toHaveValue('2026')
})

it('renders picks that have already been made, and marks the next one on the clock', async () => {
  livePicks = [
    pick(1, 1, 1, '467404039059927040', 'Bijan', 'Robinson'),
    pick(2, 1, 2, '470715135581745152', 'Jahmyr', 'Gibbs'),
  ]
  await renderDrafts()

  // Real nameplates, through the same PickCell the completed boards use (shortName → "B. Robinson").
  await waitFor(() => expect(screen.getByText('B. Robinson')).toBeInTheDocument())
  expect(screen.getByText('J. Gibbs')).toBeInTheDocument()

  // Progress reads off the picks themselves, and pick 3 is next.
  expect(screen.getByText(/Drafting now/)).toBeInTheDocument()
  expect(screen.getByText(/pick 3 of 18/)).toBeInTheDocument()
  expect(screen.getByText('On the clock')).toBeInTheDocument()
})

it('says the draft is complete once every pick is in, and stops polling', async () => {
  const owners = Object.keys(PREMIER_ORDER)
  // 6 slots × 3 rounds = 18 picks, snake order.
  livePicks = Array.from({ length: 18 }, (_, i) => {
    const round = Math.floor(i / 6) + 1
    const inRound = (i % 6) + 1
    const slot = round % 2 === 1 ? inRound : 6 - inRound + 1
    return pick(i + 1, round, slot, owners[slot - 1]!, 'Player', `Number${i + 1}`)
  })
  await renderDrafts()

  await waitFor(() => expect(screen.getByText(/Draft complete/)).toBeInTheDocument())
  expect(screen.queryByText('On the clock')).not.toBeInTheDocument()

  // Polling really has stopped: the visibility-change refresh (the other thing that triggers a
  // fetch) is a no-op once the board is full.
  const pickCalls = () => (globalThis.fetch as unknown as { mock: { calls: [string][] } }).mock.calls.filter((c) => c[0].includes('/picks')).length
  const before = pickCalls()
  document.dispatchEvent(new Event('visibilitychange'))
  await new Promise((r) => setTimeout(r, 10))
  expect(pickCalls()).toBe(before)
})

it('does not put 1.01 on the clock before the draft starts', async () => {
  // The board goes up hours (or days) early. Until Sleeper says the draft is under way it is a
  // preview of who picks where — pulsing 1.01 the whole time would read as a draft in progress.
  await renderDrafts()
  await waitFor(() => expect(screen.getByText(/3 rounds · snake/)).toBeInTheDocument())

  expect(screen.queryByText('On the clock')).not.toBeInTheDocument()
  expect(screen.queryByText(/Drafting now/)).not.toBeInTheDocument()
  expect(screen.getByText('1.01')).toBeInTheDocument()
})

it('picks up the start on its own, without a reload, and puts 1.01 on the clock', async () => {
  await renderDrafts()
  await waitFor(() => expect(screen.queryByText('On the clock')).not.toBeInTheDocument())

  // The commissioner hits start: Sleeper's status flips before any pick exists. The board re-reads
  // the draft on a timer, and a returning tab re-reads immediately — which is what this triggers.
  DRAFT.status = 'drafting'
  document.dispatchEvent(new Event('visibilitychange'))

  await waitFor(() => expect(screen.getByText('On the clock')).toBeInTheDocument())
  expect(screen.getByText(/Drafting now/)).toBeInTheDocument()
  expect(screen.getByText(/pick 1 of 18/)).toBeInTheDocument()
})

it('shows a pick made after the page loaded, without a reload', async () => {
  await renderDrafts()
  await waitFor(() => expect(screen.getByText(/3 rounds · snake/)).toBeInTheDocument())

  DRAFT.status = 'drafting'
  livePicks = [pick(1, 1, 1, '467404039059927040', 'Bijan', 'Robinson')]
  document.dispatchEvent(new Event('visibilitychange'))

  await waitFor(() => expect(screen.getByText('B. Robinson')).toBeInTheDocument())
  expect(screen.getByText(/pick 2 of 18/)).toBeInTheDocument()
})
