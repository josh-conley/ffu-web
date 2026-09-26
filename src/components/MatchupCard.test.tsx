import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import type { Game } from '@/data'
import { FixtureCard, MatchupCard } from './MatchupCard'
import { TeamProfileContext } from './teamProfile'

// The series line reads every season on file; stub it so these tests stay about the card.
const preview = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('@/hooks/useSeriesPreview', () => ({ useSeriesPreview: () => preview.value }))

// ffu-001 is The Stallions (STA), ffu-002 FFUcked Up.
const game: Game = {
  week: 3,
  isPlayoff: false,
  participants: [
    { memberId: 'ffu-001', score: 42.5 },
    { memberId: 'ffu-002', score: 0 },
  ],
}
const lastMet = { year: '2024', tier: 'PREMIER' as const, week: 16, isPlayoff: true, score: 1, opponentScore: 0, result: 'W' as const }

const rowOf = (name: string) => screen.getByText(name).closest('div')!

describe('MatchupCard', () => {
  beforeEach(() => {
    preview.value = { standing: { meetings: 6, leaderId: 'ffu-001', leaderWins: 4, trailerWins: 2, ties: 0 }, lastMet }
  })

  it('gives a final result the winner bar and mutes the loser, with no series line', () => {
    render(<MatchupCard game={game} year="2026" />)
    expect(rowOf('The Stallions')).toHaveClass('border-accent')
    expect(rowOf('FFUcked Up')).toHaveClass('text-muted')
    expect(screen.queryByText(/leads/)).not.toBeInTheDocument()
  })

  it('keeps both teams full-strength while live — no winner bar, only the leading score bold', () => {
    render(<MatchupCard game={game} year="2026" status="live" />)
    for (const name of ['The Stallions', 'FFUcked Up']) {
      expect(rowOf(name)).not.toHaveClass('border-accent')
      expect(rowOf(name)).not.toHaveClass('text-muted')
    }
    expect(screen.getByText('42.50')).toHaveClass('font-semibold')
    expect(screen.getByText('0.00')).not.toHaveClass('font-semibold')
    expect(screen.getByText('STA leads 4–2 · last met in the 2024 playoffs')).toBeInTheDocument()
  })

  it('shows no series line for a first meeting', () => {
    preview.value = null
    render(<MatchupCard game={game} year="2026" status="live" />)
    expect(screen.queryByText(/leads|tied|last met/)).not.toBeInTheDocument()
  })

  it('names both teams on the lineups button', () => {
    render(<MatchupCard game={game} year="2026" status="live" onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: 'The Stallions vs FFUcked Up, view lineups' })).toBeInTheDocument()
  })
})

describe('MatchupCard team links', () => {
  const withProfile = (ui: ReactElement) => render(<TeamProfileContext.Provider value={() => {}}>{ui}</TeamProfileContext.Provider>)

  it('links each team on a plain card', () => {
    withProfile(<MatchupCard game={game} year="2026" />)
    expect(screen.getByRole('button', { name: 'The Stallions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'FFUcked Up' })).toBeInTheDocument()
  })

  it('nests no control inside the whole-card lineups button', () => {
    withProfile(<MatchupCard game={game} year="2026" onOpen={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})

describe('FixtureCard', () => {
  it('carries the series line and a named lineups button', () => {
    preview.value = { standing: { meetings: 2, leaderWins: 1, trailerWins: 1, ties: 0 }, lastMet: { ...lastMet, isPlayoff: false, week: 9 } }
    render(<FixtureCard fixture={{ week: 4, memberIds: ['ffu-001', 'ffu-002'] }} year="2026" onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: 'The Stallions vs FFUcked Up, view lineups' })).toBeInTheDocument()
    expect(screen.getByText('Series tied 1–1 · last met 2024 Wk 9')).toBeInTheDocument()
  })
})
