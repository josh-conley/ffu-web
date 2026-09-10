import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Milestones } from './Milestones'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

afterEach(() => vi.unstubAllGlobals())

function renderPage() {
  vi.stubGlobal('fetch', (url: string) =>
    Promise.resolve(
      FILES[url] === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => FILES[url] } as Response),
    ),
  )
  return render(
    <MemoryRouter>
      <Milestones />
    </MemoryRouter>,
  )
}

const sectionFor = (heading: string) => screen.getByText(heading).closest('section') as HTMLElement

it('lists a section per category', async () => {
  renderPage()
  await waitFor(() => expect(screen.getByText('Milestone Watch')).toBeInTheDocument())
  for (const heading of ['Points Scored', 'Career Wins', 'Career Earnings', 'Points Against']) {
    expect(screen.getByText(heading)).toBeInTheDocument()
  }
})

it('puts the closest team to its milestone first', async () => {
  renderPage()
  await waitFor(() => expect(screen.getByText('Milestone Watch')).toBeInTheDocument())
  const rows = within(sectionFor('Career Wins')).getAllByRole('row').slice(1)
  const toGo = rows.map((r) => Number(within(r).getAllByRole('cell')[3]!.textContent))
  expect(toGo).toEqual([...toGo].sort((a, b) => a - b))
})

it('shows only teams inside the watch band, not everyone below a milestone', async () => {
  renderPage()
  await waitFor(() => expect(screen.getByText('Milestone Watch')).toBeInTheDocument())
  // 61 members have career wins; only the handful closing on 50 belong here. A page listing
  // everyone under 50 would be the whole league and would mean nothing.
  const rows = within(sectionFor('Career Wins')).getAllByRole('row').slice(1)
  expect(rows.length).toBeGreaterThan(0)
  expect(rows.length).toBeLessThan(20)
})

it('credits milestones already banked to the season they were reached in', async () => {
  renderPage()
  await waitFor(() => expect(screen.getByText('Milestone Watch')).toBeInTheDocument())
  const chips = within(sectionFor('Career Earnings')).getAllByRole('listitem')
  expect(chips.length).toBeGreaterThan(0)
  // Every chip names a member, an amount and a year.
  expect(chips[0]!.textContent).toMatch(/\$[\d,]+ in \d{4}/)
})
