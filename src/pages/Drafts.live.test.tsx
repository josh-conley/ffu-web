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

const DRAFT = {
  draft_id: 'd1',
  start_time: 1788804046000,
  status: 'pre_draft',
  created: 1,
  draft_order: PREMIER_ORDER,
  settings: { rounds: 3 },
}

beforeEach(() => {
  vi.stubGlobal('fetch', (url: string) => {
    const body = url.includes('/drafts') ? [DRAFT] : FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })
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
