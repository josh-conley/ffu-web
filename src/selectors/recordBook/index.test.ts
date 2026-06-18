import { describe, expect, it } from 'vitest'
import type { Game, SeasonData, SeasonTeam } from '@/data'
import { ALL_CATEGORY_IDS, computeRecordBook } from './index'

// Minimal fixtures — only the fields the selectors read; era/ids are irrelevant to the math.
const team = (memberId: string, wins: number, losses: number, pf: number, pa: number, finalPlacement?: number): SeasonTeam =>
  ({ memberId, record: { wins, losses, ties: 0 }, points: { for: pf, against: pa }, finalPlacement, promoted: false, relegated: false })

const game = (week: number, a: string, as: number, b: string, bs: number, isPlayoff = false): Game =>
  ({ week, isPlayoff, participants: [{ memberId: a, score: as }, { memberId: b, score: bs }] })

const season = (year: string, teams: SeasonTeam[], games: Game[]): SeasonData =>
  ({ schemaVersion: 1, tier: 'PREMIER', year, era: 'sleeper', platformLeagueId: 'x', teams, games } as unknown as SeasonData)

// A wins the most every year; the 180.5 game is the single-week scoring peak.
const seasons: SeasonData[] = [
  season('2022', [team('A', 10, 4, 1600, 1400, 1), team('B', 8, 6, 1500, 1450, 2), team('C', 2, 12, 1100, 1700, 14)], [
    game(1, 'A', 180.5, 'B', 120.0),
    game(2, 'A', 150.0, 'C', 90.0),
    game(3, 'B', 130.0, 'C', 88.0),
  ]),
  season('2023', [team('A', 9, 5, 1550, 1420, 1), team('B', 7, 7, 1480, 1490, 4), team('C', 4, 10, 1200, 1600, 12)], [
    game(1, 'A', 140.0, 'B', 121.0),
    game(2, 'A', 145.0, 'C', 95.0),
    game(3, 'B', 110.0, 'C', 99.0),
  ]),
]

describe('computeRecordBook', () => {
  const book = computeRecordBook(seasons)

  it('only emits ids that exist in the section layout (guards against id drift)', () => {
    for (const id of book.keys()) expect(ALL_CATEGORY_IDS).toContain(id)
  })

  it('finds the single-season wins record', () => {
    const e = book.get('rs-most-wins-reg')
    expect(e).toMatchObject({ teamId: 'A', value: '10', year: '2022' })
  })

  it('sums wins across seasons for the career record', () => {
    const e = book.get('rs-most-wins-career')
    expect(e).toMatchObject({ teamId: 'A', value: '19' })
  })

  it('counts championships (finalPlacement === 1) across seasons', () => {
    expect(book.get('ch-most-champ-wins')).toMatchObject({ teamId: 'A', value: '2' })
  })

  it('finds the highest single-week score', () => {
    expect(book.get('tp-most-week')).toMatchObject({ teamId: 'A', value: '180.50' })
  })

  it('computes a career point-differential leader with a sign', () => {
    const e = book.get('pd-best')
    expect(e?.teamId).toBe('A')
    expect(e?.value.startsWith('+')).toBe(true)
  })
})
