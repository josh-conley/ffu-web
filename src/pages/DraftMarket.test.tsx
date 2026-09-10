import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DraftMarket } from './DraftMarket'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

afterEach(() => vi.unstubAllGlobals())

function renderAt(path = '/adp-comparison') {
  vi.stubGlobal('fetch', (url: string) =>
    Promise.resolve(
      FILES[url] === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => FILES[url] } as Response),
    ),
  )
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DraftMarket />
    </MemoryRouter>,
  )
}

const sectionFor = (heading: string) => screen.getByText(heading).closest('section') as HTMLElement
// Matched loosely: the heading carries the live season's year, which moves each September.
const ready = () => waitFor(() => expect(screen.getByRole('heading', { name: /ADP Comparison/ })).toBeInTheDocument())

it('ranks reaches ahead of the field and values behind it', async () => {
  renderAt()
  await ready()
  const diff = (heading: string) =>
    within(sectionFor(heading))
      .getAllByRole('row')
      .slice(1)
      .map((r) => Number(within(r).getAllByRole('cell')[5]!.textContent))

  const reaches = diff('Biggest Reaches')
  const values = diff('Biggest Values')
  expect(reaches.every((d) => d > 0)).toBe(true)
  expect(values.every((d) => d < 0)).toBe(true)
  // Biggest first in each direction.
  expect(reaches).toEqual([...reaches].sort((a, b) => b - a))
  expect(values).toEqual([...values].sort((a, b) => a - b))
})

it('shows each league side by side on the full board', async () => {
  renderAt()
  await ready()
  // The sorted column carries a ▲ indicator, so match on the label rather than the exact text.
  const headers = within(sectionFor('Every Player')).getAllByRole('columnheader').map((h) => h.textContent ?? '')
  for (const label of ['Premier', 'Masters', 'National', 'FFU ADP', 'Sleeper ADP', 'Spread']) {
    expect(headers.some((h) => h.startsWith(label))).toBe(true)
  }
})

it('switches baseline from the URL', async () => {
  renderAt('/adp-comparison?vs=sleeper')
  await ready()
  const headers = within(sectionFor('Biggest Reaches')).getAllByRole('columnheader').map((h) => h.textContent)
  expect(headers).toContain('Sleeper ADP')
  expect(headers).not.toContain('Other leagues')
})

it('scopes to one position from the URL', async () => {
  renderAt('/adp-comparison?pos=QB')
  await ready()
  const rows = within(sectionFor('Biggest Reaches')).getAllByRole('row').slice(1)
  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows) expect(row.textContent).toContain('QB')
})

it('pages the reaches ten at a time rather than truncating to a top ten', async () => {
  renderAt()
  await ready()
  const section = sectionFor('Biggest Reaches')
  expect(within(section).getAllByRole('row').slice(1)).toHaveLength(10)
  // More than one page means the list is the whole set, not a cut-off preview.
  const pager = section.textContent?.match(/Page 1 of (\d+)/)
  expect(Number(pager?.[1])).toBeGreaterThan(1)
})

it('tags each player with their position', async () => {
  renderAt('/adp-comparison?pos=QB')
  await ready()
  const row = within(sectionFor('Biggest Reaches')).getAllByRole('row')[1]!
  expect(within(row).getByText('QB')).toBeInTheDocument()
})

it('offers League, Team and Position filters', async () => {
  renderAt()
  await ready()
  for (const label of ['League', 'Team', 'Position']) expect(screen.getByLabelText(label)).toBeInTheDocument()
  // All + the 36 franchises that drafted, each labelled with its league.
  const options = within(screen.getByLabelText('Team')).getAllByRole('option')
  expect(options).toHaveLength(37)
  expect(options[1]!.textContent).toMatch(/ · (Premier|Masters|National)$/)
})

it('scopes the rankings to one league', async () => {
  renderAt('/adp-comparison?league=MASTERS')
  await ready()
  const rows = within(sectionFor('Biggest Reaches')).getAllByRole('row').slice(1)
  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows) expect(row.textContent).toContain('Masters')
})

it('scopes the rankings to one team', async () => {
  renderAt('/adp-comparison?team=ffu-044') // Shton's Strikers, Premier
  await ready()
  const rows = within(sectionFor('Biggest Reaches')).getAllByRole('row').slice(1)
  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows) expect(row.textContent).toContain("Shton's Strikers")
})

it('keeps a player on the board when a filtered league drafted them, wherever else they went', async () => {
  renderAt('/adp-comparison?league=NATIONAL')
  await ready()
  // A board row is a player, not a pick: filtering by league keeps everyone National took, and
  // still shows where the other two leagues had them — which is the comparison worth seeing.
  const headers = within(sectionFor('Every Player')).getAllByRole('columnheader').map((h) => h.textContent ?? '')
  for (const label of ['Premier', 'Masters', 'National']) {
    expect(headers.some((h) => h.startsWith(label))).toBe(true)
  }
})
