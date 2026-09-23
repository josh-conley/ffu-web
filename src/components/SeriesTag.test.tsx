import { render, screen } from '@testing-library/react'
import { SeriesTag } from './SeriesTag'

// ffu-001 is The Stallions (STA) in the member registry.
describe('SeriesTag', () => {
  it('names the leader by abbreviation, leader wins first', () => {
    render(<SeriesTag standing={{ meetings: 9, leaderId: 'ffu-001', leaderWins: 5, trailerWins: 4, ties: 0 }} />)
    expect(screen.getByText('STA leads all-time 5–4')).toBeInTheDocument()
  })

  it('says a level series is tied, and counts ties when there are any', () => {
    render(<SeriesTag standing={{ meetings: 9, leaderWins: 4, trailerWins: 4, ties: 1 }} />)
    expect(screen.getByText('All-time series tied 4–4–1')).toBeInTheDocument()
  })

  it('calls a pair that has never played a first meeting', () => {
    render(<SeriesTag standing={{ meetings: 0, leaderWins: 0, trailerWins: 0, ties: 0 }} />)
    expect(screen.getByText('First meeting')).toBeInTheDocument()
  })
})
