import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { TeamForm } from '@/selectors'
import { CupMatchupModal } from './CupMatchupModal'

beforeEach(() => vi.stubGlobal('fetch', () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response)))
afterEach(() => vi.unstubAllGlobals())

const form = (wins: number, losses: number, upr?: number): TeamForm => ({
  totals: { memberId: 'x', wins, losses, ties: 0, pointsFor: 0, pointsAgainst: 0, scores: [], high: 0, low: 0, average: 101.25, winPct: 0 },
  upr,
})

it('heads the modal with each team\'s record and UPR going into the game', () => {
  const forms: Record<string, TeamForm> = { 'ffu-001': form(4, 1, 120.5), 'ffu-002': form(2, 3) }
  render(
    <MemoryRouter>
      <CupMatchupModal
        game={{ year: '2019', week: 6, label: 'Round of 36', a: { ffuId: 'ffu-001', tier: 'PREMIER', seed: 1, score: 100 }, b: { ffuId: 'ffu-002', tier: 'NATIONAL', seed: 36, score: 90 } }}
        formOf={(ffuId) => forms[ffuId]}
        onClose={() => {}}
      />
    </MemoryRouter>,
  )
  // Each team's seed leads its line.
  expect(screen.getByText(/^#1 \S+ 4-1 · 120\.50 UPR$/)).toBeInTheDocument()
  expect(screen.getByText(/^#36 \S+ 2-3/)).toBeInTheDocument()
  // Before a UPR is rated, points per game stands in, as on the home page.
  expect(screen.getByText(/2-3 · 101\.3 PPG$/)).toBeInTheDocument()
  expect(screen.getByText('Going in')).toBeInTheDocument()
})
