import { render, screen, within } from '@testing-library/react'
import type { SeasonData, SeasonTeam } from '@/data'
import { memberComparison } from '@/selectors'
import { MemberCompare } from './MemberCompare'

// Real member ids (so names and abbreviations resolve); the seasons are made up.
const A = 'ffu-001'
const B = 'ffu-002'

const team = (memberId: string, wins: number, losses: number, pf: number, place: number): SeasonTeam =>
  ({ memberId, record: { wins, losses, ties: 0 }, points: { for: pf, against: 1000 }, finalPlacement: place }) as SeasonTeam

const season = (tier: SeasonData['tier'], year: string, teams: SeasonTeam[], games: SeasonData['games'] = []): SeasonData => ({
  schemaVersion: 1, tier, year, era: 'sleeper', platformLeagueId: 'x', teams, games,
})

const meet = (week: number, a: number, b: number, isPlayoff = false) => ({
  week, isPlayoff, participants: [{ memberId: A, score: a }, { memberId: B, score: b }],
})

const others = (n: number) => Array.from({ length: n }, (_, i) => team(`x-${i}`, 7, 7, 1100, i + 3))

const seasons = [
  season('PREMIER', '2023', [team(A, 11, 3, 1500, 1), team(B, 5, 9, 1200, 2), ...others(10)], [meet(1, 130, 100), meet(16, 120, 118, true)]),
  season('NATIONAL', '2024', [team(A, 8, 6, 1300, 4), ...others(10), team(B, 3, 11, 1000, 12)], [meet(4, 90, 110)]),
]

const renderCompare = (a = A, b = B) => render(<MemberCompare comparison={memberComparison(seasons, [], a, b)} />)

it('marks the better career figure in green', () => {
  renderCompare()
  const tape = screen.getByRole('table', { name: 'Career comparison' })
  const winPct = within(tape).getByRole('rowheader', { name: 'Win %' }).closest('tr')!
  const [aCell, , bCell] = [...winPct.children] as HTMLElement[]
  expect(aCell!.querySelector('.text-positive')).toHaveTextContent('67.9%')
  expect(bCell!.querySelector('.text-positive')).toBeNull()
})

it('draws hardware as league-colored icons, a toilet for last place', () => {
  renderCompare()
  const tape = screen.getByRole('table', { name: 'Career comparison' })
  const titles = within(tape).getByRole('rowheader', { name: 'Titles' }).closest('tr')!
  expect(titles.querySelector('[title="Premier Champion · 2023"]')).not.toBeNull()
  const last = within(tape).getByRole('rowheader', { name: 'Last' }).closest('tr')!
  expect(last.querySelector('[title="National Last place · 2024"]')).not.toBeNull()
})

it('splits the comparison by league, leaving out leagues neither played', () => {
  renderCompare()
  expect(screen.getByRole('table', { name: 'Premier comparison' })).toBeInTheDocument()
  expect(screen.getByRole('table', { name: 'National comparison' })).toBeInTheDocument()
  expect(screen.queryByRole('table', { name: 'Masters comparison' })).not.toBeInTheDocument()
})

it('lays both careers out year by year, with the pair\'s games each year', () => {
  renderCompare()
  const strip = screen.getByRole('table', { name: 'Season by season' })
  expect(within(strip).getByLabelText('2023 · Premier · 1st of 12')).toBeInTheDocument()
  expect(within(strip).getByLabelText('2024 · National · 12th of 12')).toBeInTheDocument()
  const h2hRow = within(strip).getByRole('rowheader', { name: 'H2H' }).closest('tr')!
  expect(h2hRow).toHaveTextContent('2–0')
  expect(h2hRow).toHaveTextContent('0–1')
})

it('breaks the series down, newest meeting first', () => {
  renderCompare()
  expect(screen.getByText('All-time', { selector: 'dt' }).nextElementSibling).toHaveTextContent('2–1')
  expect(screen.getByText('Playoffs', { selector: 'dt' }).nextElementSibling).toHaveTextContent('1–0')
  const meetings = screen.getByRole('table', { name: 'Every meeting' })
  expect(within(meetings).getAllByRole('row')[1]).toHaveTextContent('2024')
})

it('says so when the pair have never met', () => {
  renderCompare(A, 'ffu-003')
  expect(screen.getByText('They have never met.')).toBeInTheDocument()
})

it('compares the latest season above the career, each team in its own league', () => {
  renderCompare()
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
  expect(headings.indexOf('2024 Season')).toBeLessThan(headings.indexOf('Career'))
  const season = screen.getByRole('table', { name: '2024 season comparison' })
  // Regular-season standing (8-6 tops the table), both in National: one league, so it's a contest.
  const standing = within(season).getByRole('rowheader', { name: 'Standing' }).closest('tr')!
  expect(standing).toHaveTextContent('12th of 12')
  expect(standing.querySelector('.text-positive')).toHaveTextContent('1st of 12')
})

it('sets the pair against each other: real meetings, every week, and common opponents', () => {
  renderCompare()
  const career = screen.getByRole('table', { name: 'Career comparison' })
  const row = (name: string) => within(career).getByRole('rowheader', { name }).closest('tr')!
  const cells = (name: string) => [...row(name).children].map((c) => c.textContent)
  expect(cells('Head-to-Head')).toEqual(['2', 'Head-to-Head', '1'])
  // The only regular-season weeks both have a score on file: 2023 wk1 (130–100) and 2024 wk4 (90–110).
  expect(cells('Every-Week Series')).toEqual(['1', 'Every-Week Series', '1'])
  // The filler teams play no games here, so there is no common opponent to compare against.
  expect(cells('Vs Common Opp.')).toEqual(['—', 'Vs Common Opp.', '—'])
})
