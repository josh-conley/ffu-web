import type { PlayerMap } from '@/data'
import type { PlayerAppearance } from './playerAppearances'
import { franchisePlayers } from './franchisePlayers'

const PLAYERS: PlayerMap = { p1: { name: 'Josh Allen', position: 'QB' }, p2: { name: 'Depth Guy', position: 'WR' } }

const ap = (playerId: string, memberId: string, points: number, year = '2024', week = 1): PlayerAppearance => ({
  playerId, memberId, points, year, week, tier: 'PREMIER', isPlayoff: false, championshipBracket: false,
})

const APPS = [ap('p1', 'a', 30), ap('p1', 'a', 25, '2025'), ap('p2', 'a', 40), ap('p1', 'b', 100), ap('p3', 'a', 1)]

describe('franchisePlayers', () => {
  it("counts only this member's starts, most points first", () => {
    const rows = franchisePlayers(APPS, PLAYERS, 'a')
    expect(rows.map((r) => [r.name, r.starts, r.points, r.seasons])).toEqual([
      ['Josh Allen', 2, 55, 2],
      ['Depth Guy', 1, 40, 1],
      ['p3', 1, 1, 1],
    ])
  })

  it('stops at the count asked for', () => {
    expect(franchisePlayers(APPS, PLAYERS, 'a', 1)).toHaveLength(1)
  })

  it('is empty for a member with no lineups (pre-2021 only)', () => {
    expect(franchisePlayers(APPS, PLAYERS, 'zz')).toEqual([])
  })
})
