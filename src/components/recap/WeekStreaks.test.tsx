import { render, screen } from '@testing-library/react'
import type { Streak } from '@/selectors'
import { WeekStreaks } from './WeekStreaks'

// A block with no news is not a block. Tested here rather than on the page, because on the page it
// is only true while the live season is one week old — and the Tuesday refresh ends that.
const run = (memberId: string): Streak => ({
  memberId,
  tier: 'PREMIER',
  kind: 'W',
  length: 3,
  fromWeek: 2,
  gamesPlayed: 4,
})

it('stays away when nobody is on a run', () => {
  const { container } = render(<WeekStreaks hot={[]} cold={[]} year="2026" week={1} compact={false} />)
  expect(container).toBeEmptyDOMElement()
})

it('appears as soon as there is form to report', () => {
  render(<WeekStreaks hot={[run('ffu-001')]} cold={[]} year="2026" week={4} compact={false} />)
  expect(screen.getByText('Hot & Cold')).toBeInTheDocument()
})
