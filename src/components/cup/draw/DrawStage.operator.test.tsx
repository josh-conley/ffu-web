import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { drawCup, type CupField } from '@/lib/cupDraw.mjs'
import { LAND_MS, SPIN_MS } from '@/hooks/useCupDrawReveal'
import { outlineTournament } from '@/selectors'
import { DrawStage } from './DrawStage'

// The ways the live draw could go wrong on camera for the OPERATOR, as opposed to the draw itself
// (DrawStage.test.tsx): losing their place, a key press doing the wrong thing, the answers leaking
// early, or the seed on screen not being the seed that was used.

const mk = (prefix: string) => Array.from({ length: 12 }, (_, i) => ({ ffuId: `${prefix}-${i + 1}`, name: `${prefix.toUpperCase()} ${i + 1}` }))
const field: CupField = { PREMIER: mk('p'), MASTERS: mk('m'), NATIONAL: mk('n') }
const SEED = '4471'
/** The 2026 bracket's shape: 36 → 18 → (drop one) 8 → 4 → 2. */
const ROUNDS = outlineTournament({
  schemaVersion: 1,
  name: 'FFU Cup',
  year: '2026',
  fieldSize: 36,
  participants: [],
  rounds: [
    { key: 'r36', label: 'Round of 36', week: 6 },
    { key: 'r18', label: 'Round of 18', week: 7 },
    { key: 'r8', label: 'Quarterfinals', week: 8, dropLowestWinner: true },
    { key: 'r4', label: 'Semifinals', week: 10 },
    { key: 'final', label: 'Final', week: 12 },
  ],
})
const expected = drawCup(field, SEED)
const nameOf = (ffuId: string) =>
  [...field.PREMIER, ...field.MASTERS, ...field.NATIONAL].find((t) => t.ffuId === ffuId)!.name
const card = () => within(screen.getByRole('group', { name: /current matchup/i }))

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
}

afterEach(() => vi.unstubAllGlobals())

it('resumes part-way through a draw, and reports its progress', () => {
  stubReducedMotion(true)
  const progress = vi.fn()
  render(<DrawStage field={field} rounds={ROUNDS} seed={SEED} seasons={[]} onRestart={() => {}} resumeAt={5} onProgress={progress} />)

  expect(screen.getByText(/matchup 6 of 18/i)).toBeInTheDocument()
  expect(card().getByText(nameOf(expected.matchups[5]!.a))).toBeInTheDocument()
  expect(card().queryByText(nameOf(expected.matchups[5]!.b))).not.toBeInTheDocument()
  expect(progress).toHaveBeenLastCalledWith(5)

  fireEvent.keyDown(window, { code: 'Space' })
  expect(progress).toHaveBeenLastCalledWith(6)
})

it('offers the downloads only once the draw is complete', () => {
  stubReducedMotion(true)
  render(<DrawStage field={field} rounds={ROUNDS} seed={SEED} seasons={[]} onRestart={() => {}} />)
  expect(screen.queryByRole('button', { name: /download sheet/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument()
})

it('ignores a held space bar, so it cannot race through the reveal', () => {
  stubReducedMotion(true)
  render(<DrawStage field={field} rounds={ROUNDS} seed={SEED} seasons={[]} onRestart={() => {}} />)

  fireEvent.keyDown(window, { code: 'Space' })
  expect(card().getByText(nameOf(expected.matchups[0]!.b))).toBeInTheDocument()
  // Auto-repeat from the same press: must not move on to matchup 2.
  fireEvent.keyDown(window, { code: 'Space', repeat: true })
  fireEvent.keyDown(window, { code: 'Space', repeat: true })
  expect(screen.getByText(/matchup 1 of 18/i)).toBeInTheDocument()
})

it('advances the draw on space even when a button has focus', () => {
  stubReducedMotion(true)
  render(<DrawStage field={field} rounds={ROUNDS} seed={SEED} seasons={[]} onRestart={() => {}} />)
  const mute = screen.getByRole('button', { name: /mute the wheel/i })
  mute.focus()

  fireEvent.keyDown(mute, { code: 'Space' })
  expect(card().getByText(nameOf(expected.matchups[0]!.b))).toBeInTheDocument()
  expect(document.activeElement).not.toBe(mute)
  expect(mute).toHaveAttribute('aria-pressed', 'false')
})

it('asks before throwing a started draw away', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  const restart = vi.fn()
  render(<DrawStage field={field} rounds={ROUNDS} seed={SEED} seasons={[]} onRestart={restart} />)

  await user.click(screen.getByRole('button', { name: /^draw$/i }))
  await user.click(screen.getByRole('button', { name: /start over/i }))
  expect(restart).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: /keep drawing/i }))
  await user.click(screen.getByRole('button', { name: /start over/i }))
  await user.click(screen.getByRole('button', { name: /yes, start over/i }))
  expect(restart).toHaveBeenCalledOnce()
})

it('shows the seed exactly as typed, and quotes it in the command', () => {
  stubReducedMotion(true)
  const seed = 'week4 SNF 51'
  render(<DrawStage field={field} rounds={ROUNDS} seed={seed} seasons={[]} onRestart={() => {}} resumeAt={18} />)
  expect(screen.getAllByText(seed).length).toBeGreaterThan(0)
  expect(screen.getByText(`npm run draw-cup -- --seed "${seed}"`)).toBeInTheDocument()
})

it('rests the reel on the winner before filling the card', () => {
  stubReducedMotion(false)
  vi.stubGlobal('AudioContext', undefined)
  vi.useFakeTimers()
  try {
    render(<DrawStage field={field} rounds={ROUNDS} seed={SEED} seasons={[]} onRestart={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^draw$/i }))

    act(() => void vi.advanceTimersByTime(SPIN_MS))
    // Landed, but the card holds back while the reel rests on the result.
    expect(screen.getByText(/drawing…/i)).toBeInTheDocument()

    act(() => void vi.advanceTimersByTime(LAND_MS))
    expect(screen.queryByText(/drawing…/i)).not.toBeInTheDocument()
    expect(card().getByText(nameOf(expected.matchups[0]!.b))).toBeInTheDocument()
  } finally {
    vi.useRealTimers()
  }
})

it('does not fake a spin when only one team is left in the bowl', () => {
  stubReducedMotion(false)
  render(<DrawStage field={field} rounds={ROUNDS} seed={SEED} seasons={[]} onRestart={() => {}} resumeAt={17} />)
  fireEvent.click(screen.getByRole('button', { name: /^draw$/i }))
  expect(screen.queryByText(/drawing…/i)).not.toBeInTheDocument()
  expect(card().getByText(nameOf(expected.matchups[17]!.b))).toBeInTheDocument()
  expect(card().getByText(/last team in the bowl/i)).toBeInTheDocument()
})

it('keeps the storyline\'s space on the card whether or not there is a story yet', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  render(<DrawStage field={field} rounds={ROUNDS} seed={SEED} seasons={[]} onRestart={() => {}} />)
  const strip = () => screen.getByRole('group', { name: /current matchup/i }).querySelector('[data-story-strip]')
  expect(strip()).not.toBeNull()
  await user.click(screen.getByRole('button', { name: /^draw$/i }))
  expect(strip()).not.toBeNull()
  await user.click(screen.getByRole('button', { name: /next matchup/i }))
  expect(strip()).not.toBeNull()
})
