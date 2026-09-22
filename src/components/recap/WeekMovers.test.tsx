import { render, screen } from '@testing-library/react'
import type { Mover } from '@/selectors'
import { WeekMovers } from './WeekMovers'

// Same rule as Hot & Cold: nothing has moved in week 1, so the block stays away. See
// WeekStreaks.test.tsx for why this is a component test and not a page one.
const mover = (delta: number): Mover => ({ memberId: 'ffu-001', tier: 'PREMIER', from: 5, to: 5 - delta, delta })

it('stays away when the table has not moved', () => {
  const { container } = render(<WeekMovers risers={[]} fallers={[]} year="2026" week={1} compact={false} />)
  expect(container).toBeEmptyDOMElement()
})

it('appears as soon as somebody has moved', () => {
  render(<WeekMovers risers={[mover(2)]} fallers={[]} year="2026" week={4} compact={false} />)
  expect(screen.getByText('Risers & Fallers')).toBeInTheDocument()
})
