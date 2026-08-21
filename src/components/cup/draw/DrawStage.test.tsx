import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { drawCup, type CupField } from '@/lib/cupDraw.mjs'
import { formatDrawSheet } from '@/lib/drawSheet.mjs'
import { DrawStage } from './DrawStage'

// The point of these: the streamed draw must be the SAME draw as `npm run draw-cup`. The page
// imports the one algorithm, so what is left to prove is that the reveal shows all of it, in order,
// without dropping or reordering a tie.

const mk = (prefix: string) => Array.from({ length: 12 }, (_, i) => ({ ffuId: `${prefix}-${i + 1}`, name: `${prefix.toUpperCase()} ${i + 1}` }))
const field: CupField = { PREMIER: mk('p'), MASTERS: mk('m'), NATIONAL: mk('n') }
const SEED = '4471'
const expected = drawCup(field, SEED)

/** Reduced motion skips the suspense spin, so a test can walk 18 ties without burning 30 seconds. */
function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => vi.unstubAllGlobals())

const nameOf = (ffuId: string) =>
  [...field.PREMIER, ...field.MASTERS, ...field.NATIONAL].find((t) => t.ffuId === ffuId)!.name

/** Scope to the tie card: the bowl legitimately shows every remaining team, so a document-wide
 *  query would find a not-yet-drawn opponent sitting in the pot and prove nothing. */
const card = () => within(screen.getByRole('group', { name: /current tie/i }))

// REGRESSION: the first cut modelled only spinning/not-spinning, so with nowhere to hold a revealed
// result every tie's resting state rendered its own answer — the opponent was on screen before it
// had been drawn. These assert concealment, not just ordering.
it('does not show the opponent until the tie is actually drawn', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)

  const firstOpponent = nameOf(expected.matchups[0]!.b)
  expect(card().getByText(nameOf(expected.matchups[0]!.a))).toBeInTheDocument()
  expect(card().queryByText(firstOpponent)).not.toBeInTheDocument()
  expect(card().getByText(/on the clock/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /^draw$/i }))
  expect(card().getByText(firstOpponent)).toBeInTheDocument()
})

it('holds a revealed tie on screen, then hides the next opponent again', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)

  await user.click(screen.getByRole('button', { name: /^draw$/i }))
  // The result stays up for the operator to talk over, rather than vanishing into the ledger.
  expect(card().getByText(nameOf(expected.matchups[0]!.b))).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /next tie/i }))
  expect(card().getByText(nameOf(expected.matchups[1]!.a))).toBeInTheDocument()
  expect(card().queryByText(nameOf(expected.matchups[1]!.b))).not.toBeInTheDocument()
})

it('reveals every tie of the CLI draw, in the same order', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)

  expect(screen.getByText(SEED)).toBeInTheDocument()
  expect(screen.getAllByText(/tie 1 of 18/i).length).toBeGreaterThan(0)

  for (let i = 0; i < 18; i++) {
    const opponent = nameOf(expected.matchups[i]!.b)
    expect(card().getByText(nameOf(expected.matchups[i]!.a)), `tie ${i + 1} drawer`).toBeInTheDocument()
    // Hidden before the draw...
    expect(card().queryByText(opponent), `tie ${i + 1} opponent leaked`).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^draw$/i }))
    // ...shown after it.
    expect(card().getByText(opponent), `tie ${i + 1} opponent`).toBeInTheDocument()
    if (i < 17) await user.click(screen.getByRole('button', { name: /next tie/i }))
  }

  expect(screen.getByText(/the draw is complete/i)).toBeInTheDocument()
  const ledger = screen.getByRole('list')
  expect(ledger.querySelectorAll('li')).toHaveLength(18)
})

it('empties the Masters half of the bowl once Premier has finished drawing', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)

  expect(screen.getByText(/Masters · 12 left/i)).toBeInTheDocument()
  for (let i = 0; i < 12; i++) {
    await user.click(screen.getByRole('button', { name: /^draw$/i }))
    await user.click(screen.getByRole('button', { name: /next tie/i }))
  }

  // Phase two: the leftover Masters teams are drawers now, so nothing of theirs is left to draw.
  expect(screen.getByText(/Masters · 0 left/i)).toBeInTheDocument()
  expect(screen.getByText(/National · 6 left/i)).toBeInTheDocument()
})

it('runs a suspense spin, and a second press cuts it short', () => {
  stubReducedMotion(false)
  vi.useFakeTimers()
  try {
    render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /^draw$/i }))
    expect(screen.getByText(/drawing…/i)).toBeInTheDocument()

    // Part-way through the spin it is still undecided on screen...
    act(() => void vi.advanceTimersByTime(400))
    expect(screen.getByText(/drawing…/i)).toBeInTheDocument()

    // ...and pressing again cuts straight to the result rather than waiting it out.
    fireEvent.click(screen.getByRole('button', { name: /^reveal$/i }))
    expect(screen.queryByText(/drawing…/i)).not.toBeInTheDocument()
    expect(card().getByText(nameOf(expected.matchups[0]!.b))).toBeInTheDocument()

    // Leftover spin timers must not skip ahead to the next tie on their own.
    act(() => void vi.advanceTimersByTime(5000))
    expect(screen.getAllByText(/tie 1 of 18/i).length).toBeGreaterThan(0)
  } finally {
    vi.useRealTimers()
  }
})

it('downloads a sheet identical to the CLI output', async () => {
  stubReducedMotion(true)
  let captured: Blob | undefined
  vi.stubGlobal('URL', {
    createObjectURL: (blob: Blob) => {
      captured = blob
      return 'blob:stub'
    },
    revokeObjectURL: () => {},
  })
  const user = userEvent.setup()
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)

  await user.click(screen.getByRole('button', { name: /download sheet/i }))
  expect(captured).toBeDefined()
  // Byte-identical to `npm run draw-cup` — same formatter, same module.
  expect(await captured!.text()).toBe(formatDrawSheet(field, expected, SEED))
})

// The storyline is the reason the reveal is worth watching, so prove it renders off real games
// rather than just not crashing.
const seasonWith = (year: string, games: { week: number; a: number; b: number; isPlayoff?: boolean }[]) => ({
  schemaVersion: 1,
  tier: 'PREMIER' as const,
  year,
  era: 'sleeper' as const,
  platformLeagueId: 'x',
  teams: [],
  games: games.map((g) => ({
    week: g.week,
    isPlayoff: g.isPlayoff ?? false,
    participants: [
      { memberId: expected.matchups[0]!.a, score: g.a },
      { memberId: expected.matchups[0]!.b, score: g.b },
    ],
  })),
})

it('tells the story of a tie once it is revealed', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  const seasons = [seasonWith('2024', [{ week: 3, a: 120, b: 100 }, { week: 15, a: 90, b: 130, isPlayoff: true }])]
  render(<DrawStage field={field} seed={SEED} seasons={seasons} onRestart={() => {}} />)

  // Nothing before the draw — the story belongs to the reveal.
  expect(screen.queryByText(/met 2 times/i)).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /^draw$/i }))
  expect(screen.getByText(/met 2 times/i)).toBeInTheDocument()
  expect(screen.getByText(/all square at 1–1/i)).toBeInTheDocument()
  expect(screen.getByText(/playoff rematch/i)).toBeInTheDocument()
})

it('says so when two teams have never met', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  // Seasons that contain neither of tie 1's teams.
  const seasons = [{ ...seasonWith('2024', []), games: [] }]
  render(<DrawStage field={field} seed={SEED} seasons={seasons} onRestart={() => {}} />)

  await user.click(screen.getByRole('button', { name: /^draw$/i }))
  expect(screen.getByText(/first ever meeting/i)).toBeInTheDocument()
})
