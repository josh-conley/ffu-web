import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CUP_YEAR } from '@/config'
import type { SeasonData } from '@/data'
import { drawCup, type CupField } from '@/lib/cupDraw.mjs'
import { LAND_MS } from '@/hooks/useCupDrawReveal'
import { knockoutTimes } from '@/selectors'
import { DrawStage } from './DrawStage'

// The ways the live draw could go wrong on camera for the OPERATOR, as opposed to the draw itself
// (DrawStage.test.tsx): losing their place, a key press doing the wrong thing, the answers leaking
// early, or the seed on screen not being the seed that was used.

const mk = (prefix: string) => Array.from({ length: 12 }, (_, i) => ({ ffuId: `${prefix}-${i + 1}`, name: `${prefix.toUpperCase()} ${i + 1}` }))
const field: CupField = { PREMIER: mk('p'), MASTERS: mk('m'), NATIONAL: mk('n') }
const SEED = '4471'
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
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} resumeAt={5} onProgress={progress} />)

  expect(screen.getByText(/matchup 6 of 18/i)).toBeInTheDocument()
  expect(card().getByText(nameOf(expected.matchups[5]!.a))).toBeInTheDocument()
  expect(card().queryByText(nameOf(expected.matchups[5]!.b))).not.toBeInTheDocument()
  expect(progress).toHaveBeenLastCalledWith(5)

  fireEvent.keyDown(window, { code: 'Space' })
  expect(progress).toHaveBeenLastCalledWith(6)
})

it('offers the downloads only once the draw is complete', () => {
  stubReducedMotion(true)
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)
  expect(screen.queryByRole('button', { name: /download sheet/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument()
})

it('ignores a held space bar, so it cannot race through the reveal', () => {
  stubReducedMotion(true)
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)

  fireEvent.keyDown(window, { code: 'Space' })
  expect(card().getByText(nameOf(expected.matchups[0]!.b))).toBeInTheDocument()
  // Auto-repeat from the same press: must not move on to matchup 2.
  fireEvent.keyDown(window, { code: 'Space', repeat: true })
  fireEvent.keyDown(window, { code: 'Space', repeat: true })
  expect(screen.getByText(/matchup 1 of 18/i)).toBeInTheDocument()
})

it('advances the draw on space even when a button has focus', () => {
  stubReducedMotion(true)
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)
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
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={restart} />)

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
  render(<DrawStage field={field} seed={seed} seasons={[]} onRestart={() => {}} resumeAt={18} />)
  expect(screen.getAllByText(seed).length).toBeGreaterThan(0)
  expect(screen.getByText(`npm run draw-cup -- --seed "${seed}"`)).toBeInTheDocument()
})

it('knocks crests out one at a time until only the drawn team is standing, then names it', () => {
  stubReducedMotion(false)
  vi.stubGlobal('AudioContext', undefined)
  vi.useFakeTimers()
  try {
    const { container } = render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} />)
    const count = (state: string) => container.querySelectorAll(`[data-state="${state}"]`).length
    const times = knockoutTimes(24)
    const winner = nameOf(expected.matchups[0]!.b)

    fireEvent.click(screen.getByRole('button', { name: /^draw$/i }))
    expect(count('lit')).toBe(24)

    act(() => void vi.advanceTimersByTime(times[0]!))
    expect(count('out')).toBe(1)

    act(() => void vi.advanceTimersByTime(times.at(-1)! - times[0]!))
    // Every other crest is out; the drawn team stands alone and highlighted, not yet named.
    expect(count('out')).toBe(23)
    expect(count('standing')).toBe(1)
    expect(card().queryByText(winner)).not.toBeInTheDocument()

    act(() => void vi.advanceTimersByTime(500 + LAND_MS))
    expect(card().getByText(winner)).toBeInTheDocument()
    // The bowl holds its shape until the next matchup: the drawn crest stays put, highlighted.
    expect(count('standing')).toBe(1)
  } finally {
    vi.useRealTimers()
  }
})

it('skips the knockouts when only one team is left in the bowl', () => {
  stubReducedMotion(false)
  render(<DrawStage field={field} seed={SEED} seasons={[]} onRestart={() => {}} resumeAt={17} />)
  fireEvent.click(screen.getByRole('button', { name: /^draw$/i }))
  expect(screen.queryByText(/drawing…/i)).not.toBeInTheDocument()
  expect(card().getByText(nameOf(expected.matchups[17]!.b))).toBeInTheDocument()
  expect(card().getByText(/last team in the bowl/i)).toBeInTheDocument()
})

it('puts the drawing team\'s talking points on the card while it is on the clock', () => {
  stubReducedMotion(true)
  const drawer = expected.matchups[0]!.a
  const seasons: SeasonData[] = [
    {
      schemaVersion: 1,
      tier: 'PREMIER',
      year: CUP_YEAR,
      era: 'sleeper',
      platformLeagueId: 'x',
      games: [],
      teams: [
        { memberId: drawer, record: { wins: 3, losses: 1, ties: 0 }, points: { for: 400, against: 350 }, promoted: false, relegated: false },
        { memberId: 'other', record: { wins: 4, losses: 0, ties: 0 }, points: { for: 450, against: 300 }, promoted: false, relegated: false },
      ],
    },
  ]
  render(<DrawStage field={field} seed={SEED} seasons={seasons} onRestart={() => {}} />)
  expect(card().getByText('This season 3-1 · 2nd of 2')).toBeInTheDocument()
  expect(card().getByText('First FFU season')).toBeInTheDocument()
})
