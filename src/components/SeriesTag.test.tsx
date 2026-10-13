import { render, screen } from '@testing-library/react'
import { SeriesTag } from './SeriesTag'

// ffu-001 is The Stallions (STA) in the member registry.
describe('SeriesTag', () => {
  it('names the leader by abbreviation, leader wins first', () => {
    const { container } = render(<SeriesTag standing={{ meetings: 9, leaderId: 'ffu-001', leaderWins: 5, trailerWins: 4, ties: 0 }} />)
    expect(container).toHaveTextContent('STA leads all-time 5–4')
  })

  it('keeps the score whole, so it never breaks after the dash', () => {
    render(<SeriesTag standing={{ meetings: 7, leaderId: 'ffu-001', leaderWins: 4, trailerWins: 3, ties: 0 }} />)
    expect(screen.getByText('4–3')).toHaveClass('whitespace-nowrap')
  })

  it('says a level series is tied, and counts ties when there are any', () => {
    const { container } = render(<SeriesTag standing={{ meetings: 9, leaderWins: 4, trailerWins: 4, ties: 1 }} />)
    expect(container).toHaveTextContent('All-time series tied 4–4–1')
  })

  it('calls a pair that has never played a first meeting', () => {
    const { container } = render(<SeriesTag standing={{ meetings: 0, leaderWins: 0, trailerWins: 0, ties: 0 }} />)
    expect(container).toHaveTextContent('First meeting')
  })
})
