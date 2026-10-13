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

const both = () => screen.getByRole('table', { name: '2024 season and career comparison' })
/** A row's cells, in order: a's career, a's season, the label, b's season, b's career. */
const cells = (name: string) => [...within(both()).getByRole('rowheader', { name }).closest('tr')!.children] as HTMLElement[]
const green = (cell: HTMLElement | undefined) => cell!.querySelector('.text-positive')

it('sets the season beside the career, the better of each pair in green', () => {
  renderCompare()
  // Career 19-9 (67.9%) vs 8-20; 2024 alone 8-6 vs 3-11.
  const [aCareer, aSeason, , bSeason, bCareer] = cells('Win %')
  expect(green(aCareer)).toHaveTextContent('67.9%')
  expect(green(aSeason)).toHaveTextContent('57.1%')
  expect(bSeason).toHaveTextContent('21.4%')
  expect(green(bSeason)).toBeNull()
  expect(green(bCareer)).toBeNull()
})

it('leaves the career cells of a season-only row blank', () => {
  renderCompare()
  const [aCareer, aSeason, , bSeason, bCareer] = cells('League')
  expect(aSeason).toHaveTextContent('National')
  expect(bSeason).toHaveTextContent('National')
  expect(aCareer).toBeEmptyDOMElement()
  expect(bCareer).toBeEmptyDOMElement()
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

it('compares the latest season beside the career, each team in its own league', () => {
  renderCompare()
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
  expect(headings.indexOf('2024 Season & Career')).toBeLessThan(headings.indexOf('Career'))
  // Regular-season standing (8-6 tops the table), both in National: one league, so it's a contest.
  const [, aSeason, , bSeason] = cells('Standing')
  expect(green(aSeason)).toHaveTextContent(/^1st$/)
  expect(bSeason).toHaveTextContent('12th')
})

it('sets the pair against each other: real meetings, every week, and common opponents', () => {
  renderCompare()
  const text = (name: string) => cells(name).map((c) => c.textContent)
  // All time 2-1 (two in 2023, one in 2024); 2024 alone 0-1.
  expect(text('Head-to-Head')).toEqual(['2', '0', 'Head-to-Head', '1', '1'])
  // The only regular-season weeks both have a score on file: 2023 wk1 (130–100) and 2024 wk4 (90–110).
  expect(text('Every-Week Series')).toEqual(['1', '0', 'Every-Week Series', '1', '1'])
  // The filler teams play no games here, so there is no common opponent to compare against.
  expect(text('Vs Common Opp.')).toEqual(['—', '—', 'Vs Common Opp.', '—', '—'])
})
