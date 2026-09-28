import { render, screen, within } from '@testing-library/react'
import { nameForYear } from '@/config'
import { WeekPrizeRaces, type LeaguePrizeRace } from './WeekPrizeRaces'

const races: LeaguePrizeRace[] = [
  {
    tier: 'PREMIER',
    leaders: [
      { prize: 'mostPoints', memberIds: ['ffu-030'], value: 351.8 },
      { prize: 'highestFloor', memberIds: ['ffu-030', 'ffu-020'], value: 154.1 },
    ],
  },
  { tier: 'NATIONAL', leaders: [] },
]

it('says who leads, never that anyone has won, and prints no money', () => {
  const { container } = render(<WeekPrizeRaces races={races} settled={false} year="2026" week={3} compact={false} />)
  expect(screen.getByText('Prize Races')).toBeInTheDocument()
  expect(screen.getByText('2026 · Through Week 3')).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Leading now' })).toBeInTheDocument()
  expect(container.textContent).not.toMatch(/\$|won by|clinch/i)
  expect(screen.getByText('351.80')).toBeInTheDocument()
})

it('lists every team tied for the lead', () => {
  render(<WeekPrizeRaces races={races} settled={false} year="2026" week={3} compact={false} />)
  const row = screen.getByRole('rowheader', { name: 'Highest Floor' }).closest('tr')
  const cell = within(row as HTMLElement)
  expect(cell.getByText(nameForYear('ffu-030', '2026')!)).toBeInTheDocument()
  expect(cell.getByText(nameForYear('ffu-020', '2026')!)).toBeInTheDocument()
})

it('skips a league with nothing to report, and the whole block when none has', () => {
  render(<WeekPrizeRaces races={races} settled={false} year="2026" week={3} compact={false} />)
  expect(screen.getAllByRole('table')).toHaveLength(1)
  const { container } = render(<WeekPrizeRaces races={[]} settled={false} year="2026" week={1} compact={false} />)
  expect(container).toBeEmptyDOMElement()
})

it('names winners once the regular season is over', () => {
  render(<WeekPrizeRaces races={races} settled year="2025" week={14} compact={false} />)
  expect(screen.getByRole('columnheader', { name: 'Won by' })).toBeInTheDocument()
  expect(screen.getByText('2025 · Regular season')).toBeInTheDocument()
})
