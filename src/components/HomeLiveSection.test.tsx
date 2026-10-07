import { render, screen } from '@testing-library/react'
import { HomeLiveSection } from './HomeLiveSection'

// Tuesday: the tabs name both weeks, so the heading must not repeat the first tab.
it('heads the Tuesday tabs "Matchups" instead of repeating the week', () => {
  const weekTabs = {
    tabs: [
      { id: 'final', label: 'Week 5 · Final' },
      { id: 'current', label: 'Week 6' },
    ],
    value: 'final',
    onChange: () => {},
  }
  render(<HomeLiveSection tiers={[]} week={5} final asOf={undefined} onOpen={() => {}} weekTabs={weekTabs} />)
  expect(screen.getByRole('heading', { name: 'Matchups' })).toBeInTheDocument()
  expect(screen.getAllByText('Week 5 · Final')).toHaveLength(1)
})

it('names the week in the heading on the other days', () => {
  render(<HomeLiveSection tiers={[]} week={6} asOf={undefined} onOpen={() => {}} />)
  expect(screen.getByRole('heading', { name: 'Week 6' })).toBeInTheDocument()
})
