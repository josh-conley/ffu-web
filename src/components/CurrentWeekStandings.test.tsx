import { render, screen } from '@testing-library/react'
import type { LiveSeasonData } from '@/data'
import { CurrentWeekStandings } from './CurrentWeekStandings'

// Three of these share one row on the home page, so the table has to fit the column it is given at
// every width. jsdom does no layout, so the guarantee is asserted structurally: a fixed table that
// is exactly as wide as its box, in a box with nothing to scroll.

const season = (currentWeek: number): LiveSeasonData => ({
  tier: 'PREMIER',
  year: '2026',
  leagueId: 'L1',
  currentWeek,
  memberIds: ['ffu-001', 'ffu-008'],
  games: [
    { week: 1, isPlayoff: false, participants: [{ memberId: 'ffu-001', score: 120.5 }, { memberId: 'ffu-008', score: 99.25 }] },
    { week: 2, isPlayoff: false, participants: [{ memberId: 'ffu-001', score: 88.1 }, { memberId: 'ffu-008', score: 101.4 }] },
  ],
})

const table = () => screen.getByRole('table')

it('shows every column — no horizontal scroll to reach one', () => {
  render(<CurrentWeekStandings tier="PREMIER" data={season(3)} />)
  for (const header of ['#', 'Team', 'W-L', 'PF']) {
    expect(screen.getByRole('columnheader', { name: new RegExp(`^${header}`, 'i') })).toBeInTheDocument()
  }
  // Both weeks are complete, so the records count them both — one apiece.
  expect(screen.getAllByText('1-1')).toHaveLength(2)
  expect(screen.getByText('208.60')).toBeInTheDocument()
  expect(screen.getByText('200.65')).toBeInTheDocument()
})

it('sizes itself to its container instead of its content', () => {
  render(<CurrentWeekStandings tier="PREMIER" data={season(3)} />)
  expect(table()).toHaveClass('w-full', 'table-fixed')
  expect(table().className).not.toContain('w-max')
  // The box around it has nothing to scroll — that is the whole point of `fit`.
  const box = table().parentElement!
  expect(box).toHaveClass('overflow-hidden')
  expect(box.className).not.toContain('overflow-x-auto')
})

it('gives the number columns fixed widths and the name column the rest', () => {
  const { container } = render(<CurrentWeekStandings tier="PREMIER" data={season(3)} />)
  const cols = [...container.querySelectorAll('col')]
  expect(cols).toHaveLength(4)
  expect(cols.map((c) => c.style.width)).toEqual(['2.25rem', '', '3.25rem', '4rem'])
})

it('stays away until a week has been completed', () => {
  const { container } = render(<CurrentWeekStandings tier="PREMIER" data={season(1)} />)
  expect(container).toBeEmptyDOMElement()
})
