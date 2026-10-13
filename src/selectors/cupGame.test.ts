import { LIVE_LEAGUE_IDS } from '@/config'
import { cupGameSource } from './cupGame'

const liveYear = Object.keys(LIVE_LEAGUE_IDS)[0] ?? '2026'
const live = LIVE_LEAGUE_IDS[liveYear]

describe('cupGameSource', () => {
  it('reads a game from the season files once both scores are on file', () => {
    const source = cupGameSource('2025', { ffuId: 'a', tier: 'PREMIER', score: 101.5 }, { ffuId: 'b', tier: 'NATIONAL', score: 99 })
    expect(source).toEqual({ kind: 'final', scores: [101.5, 99] })
  })

  it('reads an unplayed game of the live season from each team\'s own league', () => {
    const source = cupGameSource(liveYear, { ffuId: 'a', tier: 'PREMIER' }, { ffuId: 'b', tier: 'NATIONAL' })
    expect(source).toEqual({ kind: 'live', leagueIds: [live?.PREMIER, live?.NATIONAL] })
  })

  it('prefers the files over Sleeper for a played week of the live season', () => {
    const source = cupGameSource(liveYear, { ffuId: 'a', tier: 'MASTERS', score: 80 }, { ffuId: 'b', tier: 'MASTERS', score: 90 })
    expect(source?.kind).toBe('final')
  })

  it('has nothing to show for an unplayed game outside the live season', () => {
    expect(cupGameSource('2019', { ffuId: 'a', tier: 'PREMIER' }, { ffuId: 'b', tier: 'MASTERS', score: 70 })).toBeUndefined()
  })
})
