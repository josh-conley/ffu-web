import { render, screen } from '@testing-library/react'
import { emptyCareer } from '@/selectors'
import { TrophyCase } from './TrophyCase'

describe('TrophyCase', () => {
  it('shows a diamond for each FFU Cup won', () => {
    render(<TrophyCase career={emptyCareer('ffu-001')} cupTitles={['2026', '2027']} />)
    expect(screen.getByTitle('FFU Cup champion · 2026')).toBeInTheDocument()
    expect(screen.getByTitle('FFU Cup champion · 2027')).toBeInTheDocument()
  })

  it('is empty with no league hardware and no Cup', () => {
    render(<TrophyCase career={emptyCareer('ffu-001')} cupTitles={[]} />)
    expect(screen.getByText('None')).toBeInTheDocument()
  })
})
