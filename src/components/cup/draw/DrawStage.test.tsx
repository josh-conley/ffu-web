import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { drawCheckCode, drawCup, type CupField } from '@/lib/cupDraw.mjs'
import { formatDrawSheet } from '@/lib/drawSheet.mjs'
import { DrawStage } from './DrawStage'

// The point of these: the streamed draw must be the SAME draw as `npm run draw-cup`. The page
// imports the one algorithm, so what is left to prove is that the reveal shows all of it, in order,
// without dropping or reordering a matchup.

const mk = (prefix: string) => Array.from({ length: 12 }, (_, i) => ({ ffuId: `${prefix}-${i + 1}`, name: `${prefix.toUpperCase()} ${i + 1}` }))
const field: CupField = { PREMIER: mk('p'), MASTERS: mk('m'), NATIONAL: mk('n') }
const SEED = '4471'
const expected = drawCup(field, SEED)

/** Reduced motion skips the suspense spin, so a test can walk 18 matchups without burning 30 seconds. */
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

/** Scope to the matchup card: the bowl legitimately shows every remaining team, so a document-wide
 *  query would find a not-yet-drawn opponent sitting in the pot and prove nothing. */
const card = () => within(screen.getByRole('group', { name: /current matchup/i }))

// REGRESSION: the first cut modelled only spinning/not-spinning, so with nowhere to hold a revealed
// result every matchup's resting state rendered its own answer — the opponent was on screen before it
// had been drawn. These assert concealment, not just ordering.
it('does not show the opponent until the matchup is actually drawn', async () => {
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

it('holds a revealed matchup on screen, then hides the next opponent again', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)

  await user.click(screen.getByRole('button', { name: /^draw$/i }))
  // The result stays up for the operator to talk over, rather than vanishing into the ledger.
  expect(card().getByText(nameOf(expected.matchups[0]!.b))).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /next matchup/i }))
  expect(card().getByText(nameOf(expected.matchups[1]!.a))).toBeInTheDocument()
  expect(card().queryByText(nameOf(expected.matchups[1]!.b))).not.toBeInTheDocument()
})

it('reveals every matchup of the CLI draw, in the same order', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)

  expect(screen.getByText(SEED)).toBeInTheDocument()
  expect(screen.getAllByText(/matchup 1 of 18/i).length).toBeGreaterThan(0)

  for (let i = 0; i < 18; i++) {
    const opponent = nameOf(expected.matchups[i]!.b)
    expect(card().getByText(nameOf(expected.matchups[i]!.a)), `matchup ${i + 1} drawer`).toBeInTheDocument()
    // Hidden before the draw...
    expect(card().queryByText(opponent), `matchup ${i + 1} opponent leaked`).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^draw$/i }))
    // ...shown after it.
    expect(card().getByText(opponent), `matchup ${i + 1} opponent`).toBeInTheDocument()
    if (i < 17) await user.click(screen.getByRole('button', { name: /next matchup/i }))
  }

  // The 18th gets its own moment on the card; one more press brings up the full results.
  expect(screen.queryByRole('region', { name: /draw complete/i })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /show all matchups/i }))
  const results = within(screen.getByRole('region', { name: /draw complete/i }))
  expect(results.getByLabelText('Round of 36').querySelectorAll('li')).toHaveLength(18)
  expect(results.getAllByText(drawCheckCode(expected)).length).toBeGreaterThan(0)
})

const bracket = () => within(screen.getByLabelText('Round of 36'))
const slots = () => screen.getByLabelText('Round of 36').querySelectorAll('li')

it('fills the bracket as matchups are drawn, never ahead of the reveal', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)

  expect(slots()).toHaveLength(18)
  // Matchup 1 is on the clock: its drawer is in slot 1, its opponent nowhere in the bracket.
  expect(within(slots()[0]!).getByText(nameOf(expected.matchups[0]!.a))).toBeInTheDocument()
  expect(bracket().queryByText(nameOf(expected.matchups[0]!.b))).not.toBeInTheDocument()
  expect(within(slots()[1]!).getByText(/to be drawn/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /^draw$/i }))
  expect(within(slots()[0]!).getByText(nameOf(expected.matchups[0]!.b))).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /next matchup/i }))
  expect(within(slots()[1]!).getByText(nameOf(expected.matchups[1]!.a))).toBeInTheDocument()
  expect(bracket().queryByText(nameOf(expected.matchups[1]!.b))).not.toBeInTheDocument()
  expect(slots()[1]).toHaveAttribute('aria-current', 'step')
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

    // Leftover spin timers must not skip ahead to the next matchup on their own.
    act(() => void vi.advanceTimersByTime(5000))
    expect(screen.getAllByText(/matchup 1 of 18/i).length).toBeGreaterThan(0)
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
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} resumeAt={18} />)

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

it('tells the story of a matchup once it is revealed', async () => {
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
  // Seasons that contain neither of matchup 1's teams.
  const seasons = [{ ...seasonWith('2024', []), games: [] }]
  render(<DrawStage field={field} seed={SEED} seasons={seasons} onRestart={() => {}} />)

  await user.click(screen.getByRole('button', { name: /^draw$/i }))
  expect(screen.getByText(/first ever meeting/i)).toBeInTheDocument()
})

it('ticks the wheel while it spins, and stops ticking if the spin is cut short', () => {
  stubReducedMotion(false)
  const cancels: number[] = []
  // Stand in for Web Audio: record the schedule handed over, and whether it gets cancelled.
  vi.stubGlobal('AudioContext', class {
    state = 'running'
    currentTime = 0
    sampleRate = 48000
    createBuffer = (_c: number, frames: number) => ({ getChannelData: () => new Float32Array(frames) })
    createBufferSource = () => ({
      buffer: null,
      connect: (n: unknown) => n,
      start: () => {},
      stop: () => cancels.push(1),
    })
    createBiquadFilter = () => ({
      type: '',
      frequency: { setValueAtTime: () => {} },
      Q: { setValueAtTime: () => {} },
      connect: (n: unknown) => n,
    })
    createGain = () => ({ gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: (n: unknown) => n })
    destination = {}
    resume = () => Promise.resolve()
  })
  vi.useFakeTimers()
  try {
    render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^draw$/i }))

    // A tick per crest of the run-up, not a fixed count.
    expect(screen.getByText(/drawing…/i)).toBeInTheDocument()

    // Cutting the spin short must silence the pending ticks.
    fireEvent.click(screen.getByRole('button', { name: /^reveal$/i }))
    expect(cancels.length).toBeGreaterThan(0)
  } finally {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  }
})

it('schedules no ticks when muted', () => {
  stubReducedMotion(false)
  let contextsCreated = 0
  vi.stubGlobal('AudioContext', class {
    constructor() {
      contextsCreated++
    }
  })
  vi.useFakeTimers()
  try {
    render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /mute the wheel/i }))
    fireEvent.click(screen.getByRole('button', { name: /^draw$/i }))
    expect(contextsCreated).toBe(0)
  } finally {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  }
})
