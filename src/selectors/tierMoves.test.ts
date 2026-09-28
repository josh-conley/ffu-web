import type { Tier } from '@/config'
import type { SeasonTeam } from '@/data'
import type { MemberSeason } from './career'
import { tierMoves } from './tierMoves'

const s = (year: string, tier: Tier, flag?: 'promoted' | 'relegated'): MemberSeason => {
  const team: SeasonTeam = {
    memberId: 'a',
    record: { wins: 0, losses: 0, ties: 0 },
    points: { for: 0, against: 0 },
    promoted: flag === 'promoted',
    relegated: flag === 'relegated',
  }
  return { year, tier, team }
}

describe('tierMoves', () => {
  it('reports the stored flags as promotions and relegations', () => {
    const moves = tierMoves([s('2022', 'MASTERS', 'promoted'), s('2023', 'PREMIER', 'relegated'), s('2024', 'MASTERS')])
    expect(moves).toEqual([
      { year: '2022', from: 'MASTERS', to: { year: '2023', tier: 'PREMIER' }, kind: 'promoted' },
      { year: '2023', from: 'PREMIER', to: { year: '2024', tier: 'MASTERS' }, kind: 'relegated' },
    ])
  })

  it('shows an unflagged tier change as a move, not a promotion (e.g. the 2022 expansion)', () => {
    expect(tierMoves([s('2021', 'NATIONAL'), s('2022', 'MASTERS')])).toEqual([
      { year: '2021', from: 'NATIONAL', to: { year: '2022', tier: 'MASTERS' }, kind: 'moved-up' },
    ])
    expect(tierMoves([s('2019', 'PREMIER'), s('2020', 'NATIONAL')])[0]?.kind).toBe('moved-down')
  })

  it('calls a tier change across a gap a return, and ignores staying put', () => {
    expect(tierMoves([s('2020', 'PREMIER'), s('2021', 'PREMIER'), s('2024', 'NATIONAL')])).toEqual([
      { year: '2021', from: 'PREMIER', to: { year: '2024', tier: 'NATIONAL' }, kind: 'returned' },
    ])
  })

  it('keeps a flag on the latest season even with no season after it', () => {
    expect(tierMoves([s('2025', 'NATIONAL', 'promoted')])).toEqual([{ year: '2025', from: 'NATIONAL', kind: 'promoted' }])
  })

  it('sorts input by year first', () => {
    expect(tierMoves([s('2023', 'PREMIER'), s('2022', 'MASTERS', 'promoted')])[0]?.year).toBe('2022')
  })
})
