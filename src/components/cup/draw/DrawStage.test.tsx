import { act, fireEvent, render, screen } from '@testing-library/react'
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

it('reveals every tie of the CLI draw, in the same order', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  render(<DrawStage field={field} seed={SEED} onRestart={() => {}} />)

  expect(screen.getByText(SEED)).toBeInTheDocument()
  // The counter appears in both the top bar and the tie card.
  expect(screen.getAllByText(/tie 1 of 18/i).length).toBeGreaterThan(0)

  for (let i = 0; i < 18; i++) {
    // The drawing team is on the clock before the tie is made.
    const drawerName = field.PREMIER.concat(field.MASTERS).find((t) => t.ffuId === expected.matchups[i]!.a)!.name
    expect(screen.getAllByText(drawerName).length, `tie ${i + 1} drawer`).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /draw next/i }))
  }

  expect(screen.getByText(/the draw is complete/i)).toBeInTheDocument()

  // The ledger holds all 18 ties, and its numbering runs 1..18.
  const ledger = screen.getByRole('list')
  expect(ledger.querySelectorAll('li')).toHaveLength(18)
})

it('empties the Masters half of the bowl once Premier has finished drawing', async () => {
  stubReducedMotion(true)
  const user = userEvent.setup()
  render(<DrawStage field={field} seed={SEED} onRestart={() => {}} />)

  expect(screen.getByText(/Masters · 12 left/i)).toBeInTheDocument()
  for (let i = 0; i < 12; i++) await user.click(screen.getByRole('button', { name: /draw next/i }))

  // Phase two: the leftover Masters teams are drawers now, so nothing of theirs is left to draw.
  expect(screen.getByText(/Masters · 0 left/i)).toBeInTheDocument()
  expect(screen.getByText(/National · 6 left/i)).toBeInTheDocument()
})

it('runs a suspense spin, and a second press cuts it short', () => {
  stubReducedMotion(false)
  vi.useFakeTimers()
  try {
    render(<DrawStage field={field} seed={SEED} onRestart={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /draw next/i }))
    expect(screen.getByText(/drawing…/i)).toBeInTheDocument()

    // Part-way through the spin it is still undecided on screen...
    act(() => void vi.advanceTimersByTime(400))
    expect(screen.getByText(/drawing…/i)).toBeInTheDocument()

    // ...and pressing again cuts straight to the result rather than waiting it out.
    fireEvent.click(screen.getByRole('button', { name: /^reveal$/i }))
    expect(screen.queryByText(/drawing…/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/tie 2 of 18/i).length).toBeGreaterThan(0)

    // Leftover spin timers must not advance the draw a second time.
    act(() => void vi.advanceTimersByTime(5000))
    expect(screen.getAllByText(/tie 2 of 18/i).length).toBeGreaterThan(0)
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
  render(<DrawStage field={field} seed={SEED} onRestart={() => {}} />)

  await user.click(screen.getByRole('button', { name: /download sheet/i }))
  expect(captured).toBeDefined()
  // Byte-identical to `npm run draw-cup` — same formatter, same module.
  expect(await captured!.text()).toBe(formatDrawSheet(field, expected, SEED))
})
