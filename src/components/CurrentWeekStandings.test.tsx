import { render, screen } from '@testing-library/react'
import type { LiveSeasonData } from '@/data'
import { CurrentWeekStandings } from './CurrentWeekStandings'

// Three of these share one row on the home page, so the table has to fit the column it is given at
// every width. jsdom does no layout, so the guarantee is asserted structurally: a fixed table that
// is exactly as wide as its box, in a box with nothing to scroll.

const game = (week: number, a: number, b: number) => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: 'ffu-001', score: a },
    { memberId: 'ffu-008', score: b },
  ],
})

/** ffu-001 wins week 1, ffu-008 wins the next two — so ffu-008 arrives on a 2W and ffu-001 a 2L. */
const season = (currentWeek: number): LiveSeasonData => ({
  tier: 'PREMIER',
  year: '2026',
  leagueId: 'L1',
  currentWeek,
  memberIds: ['ffu-001', 'ffu-008'],
  games: [game(1, 120.5, 99.25), game(2, 88.1, 101.4), game(3, 90, 110)],
})

const table = () => screen.getByRole('table')

it('puts the record and both points totals under the team name', () => {
  render(<CurrentWeekStandings tier="PREMIER" data={season(3)} />)
  expect(screen.getByText('1-1 · 208.60 PF · 200.65 PA')).toBeInTheDocument()
  expect(screen.getByText('1-1 · 200.65 PF · 208.60 PA')).toBeInTheDocument()
})

it('names the league across the top instead of labelling the columns', () => {
  render(<CurrentWeekStandings tier="MASTERS" data={season(3)} />)
  const [heading, ...rest] = screen.getAllByRole('columnheader')
  expect(rest).toHaveLength(0)
  expect(heading).toHaveTextContent('Masters')
  // It stands for both columns, so every cell under it is announced as this league's.
  expect(heading).toHaveAttribute('colspan', '2')
  expect(heading).toHaveAttribute('scope', 'colgroup')
})

it('reads as a label, not a control — nothing here sorts', () => {
  render(<CurrentWeekStandings tier="PREMIER" data={season(3)} />)
  const heading = screen.getByRole('columnheader')
  expect(heading.querySelector('button')).toBeNull()
  expect(heading).not.toHaveAttribute('aria-sort')
})

it('flags a run of two or more, and stays quiet otherwise', () => {
  render(<CurrentWeekStandings tier="PREMIER" data={season(4)} />)
  // Three weeks are complete: ffu-008 has won the last two, ffu-001 has lost them.
  expect(screen.getByText('2W')).toBeInTheDocument()
  expect(screen.getByText('2L')).toBeInTheDocument()
})

it('says nothing about form after a single result', () => {
  render(<CurrentWeekStandings tier="PREMIER" data={season(2)} />)
  expect(screen.queryByText('1W')).not.toBeInTheDocument()
  expect(screen.queryByText('1L')).not.toBeInTheDocument()
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

it('gives the rank column a fixed width and the name column the rest', () => {
  const { container } = render(<CurrentWeekStandings tier="PREMIER" data={season(3)} />)
  const cols = [...container.querySelectorAll('col')]
  expect(cols).toHaveLength(2)
  expect(cols.map((c) => c.style.width)).toEqual(['2.25rem', ''])
})

it('stays away until a week has been completed', () => {
  const { container } = render(<CurrentWeekStandings tier="PREMIER" data={season(1)} />)
  expect(container).toBeEmptyDOMElement()
})
