import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { DraftSchedule } from '@/data'
import type { Tier } from '@/config'
import { UpcomingDrafts } from './UpcomingDrafts'

const schedule = (tier: Tier, status: string, startTime: number | null): DraftSchedule => ({ tier, year: '2026', status, startTime })

const show = (schedules: DraftSchedule[]) =>
  render(
    <MemoryRouter>
      <UpcomingDrafts year="2026" schedules={schedules} />
    </MemoryRouter>,
  )

it('announces the dates when every draft is still ahead', () => {
  show([schedule('MASTERS', 'pre_draft', Date.now() + 86_400_000)])
  expect(screen.getByText(/2026 Draft Season Is Coming/i)).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

it('points at the board of a draft that is under way', () => {
  show([schedule('MASTERS', 'drafting', Date.now() - 60_000)])
  expect(screen.getByText(/2026 Draft Night Is Live/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Drafting now/i })).toHaveAttribute('href', '/drafts?year=2026&tier=MASTERS')
})

it('points at the board of a draft that has finished', () => {
  show([schedule('MASTERS', 'complete', Date.now() - 86_400_000)])
  expect(screen.getByRole('link', { name: /Draft complete/i })).toHaveAttribute('href', '/drafts?year=2026&tier=MASTERS')
  // One league being done doesn't change the headline while the others are still to come.
  expect(screen.getByText(/2026 Draft Season Is Coming/i)).toBeInTheDocument()
})

it('stands down once all three drafts are complete', () => {
  // The panel announces what is coming or running. With every draft finished it has nothing left to
  // say, so it leaves the home page rather than sitting there all season — and returns by itself
  // next preseason, when Sleeper creates the drafts.
  const done = (['PREMIER', 'MASTERS', 'NATIONAL'] as Tier[]).map((t) => schedule(t, 'complete', Date.now() - 86_400_000))
  const { container } = show(done)
  expect(container).toBeEmptyDOMElement()
})
