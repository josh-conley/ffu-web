import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LIVE_LEAGUE_IDS } from '@/config'
import type { ResolvedTournament } from '@/selectors'
import { TournamentBracket } from './TournamentBracket'

const liveYear = Object.keys(LIVE_LEAGUE_IDS)[0] ?? '2026'

function bracket(year: string, scored: boolean): ResolvedTournament {
  const score = (n: number) => (scored ? n : undefined)
  return {
    name: 'FFU Cup',
    year,
    rounds: [
      {
        key: 'r36',
        label: 'Round of 36',
        week: 6,
        dropped: [],
        matchups: [{ a: { ffuId: 'ffu-001', tier: 'PREMIER', score: score(100) }, b: { ffuId: 'ffu-002', tier: 'NATIONAL', score: score(90) }, tie: false }],
      },
    ],
  }
}

const renderBracket = (t: ResolvedTournament) =>
  render(
    <MemoryRouter>
      <TournamentBracket tournament={t} year={t.year} onOpen={() => {}} />
    </MemoryRouter>,
  )

it('opens a played game', () => {
  renderBracket(bracket('2019', true))
  expect(screen.getAllByRole('button')).toHaveLength(1)
})

it('opens an unplayed game of the live season, whose lineups Sleeper has', () => {
  renderBracket(bracket(liveYear, false))
  expect(screen.getAllByRole('button')).toHaveLength(1)
})

it('has nothing to open for an unplayed game of a past season', () => {
  renderBracket(bracket('2019', false))
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
