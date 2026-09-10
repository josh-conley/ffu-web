import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Matchups } from './Matchups'
import manifest from '../../public/data/seasons.json'
import premier2025 from '../../public/data/2025/premier.json'
import premier2026 from '../../public/data/2026/premier.json'

const FILES: Record<string, unknown> = {
  '/data/seasons.json': manifest,
  '/data/2025/premier.json': premier2025,
  '/data/2026/premier.json': premier2026,
}

afterEach(() => vi.unstubAllGlobals())

it('renders week sections with matchup cards for a completed season', async () => {
  vi.stubGlobal('fetch', (url: string) => {
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })

  render(
    <MemoryRouter initialEntries={['/matchups?year=2025']}>
      <Routes>
        <Route path="matchups" element={<Matchups />} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() => expect(screen.getByText('Week 1')).toBeInTheDocument())
  // A 12-team league plays 6 games in week 1.
  expect(screen.getByText('Week 17')).toBeInTheDocument()
})

it('offers a member filter scoped to the selected season', async () => {
  vi.stubGlobal('fetch', (url: string) => {
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })

  render(
    <MemoryRouter initialEntries={['/matchups?year=2025']}>
      <Routes>
        <Route path="matchups" element={<Matchups />} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() => expect(screen.getByText('Week 1')).toBeInTheDocument())
  const memberSelect = screen.getByRole('combobox', { name: 'Member' })
  // "All members" + the 12 teams in the season (and only those).
  expect(within(memberSelect).getAllByRole('option')).toHaveLength(13)
})

it('opens on the season being played and lists its fixtures before any are played', async () => {
  vi.stubGlobal('fetch', (url: string) => {
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })

  render(
    <MemoryRouter initialEntries={['/matchups']}>
      <Routes>
        <Route path="matchups" element={<Matchups />} />
      </Routes>
    </MemoryRouter>,
  )

  // No results exist yet, but the fixture list does — so the page must not be blank, and must not
  // fall back to last season just because this one hasn't been played.
  await waitFor(() => expect(screen.getAllByText('Upcoming').length).toBeGreaterThan(0))
  expect(screen.getByRole('combobox', { name: 'Season year' })).toHaveValue('2026')
  // 14 regular-season weeks, all still to come.
  expect(screen.getAllByText('Upcoming')).toHaveLength(14)
  // Scores are shown as em-dashes, never as 0.00 — nothing has been played.
  expect(screen.queryByText('0.00')).not.toBeInTheDocument()
})
