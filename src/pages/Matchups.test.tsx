import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Matchups } from './Matchups'
import manifest from '../../public/data/seasons.json'
import premier2025 from '../../public/data/2025/premier.json'

const FILES: Record<string, unknown> = {
  '/data/seasons.json': manifest,
  '/data/2025/premier.json': premier2025,
}

afterEach(() => vi.unstubAllGlobals())

it('renders week sections with matchup cards for the latest season', async () => {
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

  await waitFor(() => expect(screen.getByText('Week 1')).toBeInTheDocument())
  // A 12-team league plays 6 games in week 1.
  expect(screen.getByText('Week 17')).toBeInTheDocument()
})
