import type { SeasonData } from '@/data'
import { headToHead, lastMeeting, seriesPreview, seriesStanding } from './headToHead'

const mk = (year: string, games: SeasonData['games']): SeasonData => ({
  schemaVersion: 1, tier: 'PREMIER', year, era: 'sleeper', platformLeagueId: 'x', teams: [], games,
})

const seasons = [
  mk('2023', [
    { week: 1, isPlayoff: false, participants: [{ memberId: 'a', score: 120 }, { memberId: 'b', score: 100 }] },
    { week: 7, isPlayoff: false, participants: [{ memberId: 'a', score: 90 }, { memberId: 'c', score: 95 }] },
  ]),
  mk('2024', [
    { week: 16, isPlayoff: true, round: 'Championship', participants: [{ memberId: 'b', score: 110 }, { memberId: 'a', score: 130 }] },
    { week: 3, isPlayoff: false, participants: [{ memberId: 'a', score: 88 }, { memberId: 'b', score: 88 }] },
  ]),
]

describe('headToHead', () => {
  it('aggregates all meetings between two members across seasons', () => {
    const h = headToHead(seasons, 'a', 'b')
    expect({ w: h.wins, l: h.losses, t: h.ties }).toEqual({ w: 2, l: 0, t: 1 })
    expect(h.pointsFor).toBe(120 + 130 + 88)
    expect(h.pointsAgainst).toBe(100 + 110 + 88)
    expect(h.meetings).toHaveLength(3)
    expect(h.meetings.find((m) => m.isPlayoff)?.round).toBe('Championship')
  })

  it('is symmetric (a vs b wins == b vs a losses)', () => {
    const ab = headToHead(seasons, 'a', 'b')
    const ba = headToHead(seasons, 'b', 'a')
    expect(ab.wins).toBe(ba.losses)
    expect(ab.ties).toBe(ba.ties)
    expect(ab.pointsFor).toBe(ba.pointsAgainst)
  })

  it('ignores games where the pair did not meet', () => {
    expect(headToHead(seasons, 'a', 'c').meetings).toHaveLength(1)
    expect(headToHead(seasons, 'b', 'c').meetings).toHaveLength(0)
  })
})

describe('seriesStanding', () => {
  it('names the leader and puts their wins first, whichever side asked', () => {
    const expected = { meetings: 3, leaderId: 'a', leaderWins: 2, trailerWins: 0, ties: 1 }
    expect(seriesStanding(headToHead(seasons, 'a', 'b'))).toEqual(expected)
    expect(seriesStanding(headToHead(seasons, 'b', 'a'))).toEqual(expected)
  })

  it('has no leader when the series is level', () => {
    const level = mk('2025', [{ week: 2, isPlayoff: false, participants: [{ memberId: 'a', score: 80 }, { memberId: 'c', score: 70 }] }])
    const s = seriesStanding(headToHead([...seasons, level], 'a', 'c'))
    expect(s).toEqual({ meetings: 2, leaderWins: 1, trailerWins: 1, ties: 0 })
  })

  it('has no leader and no meetings for teams that have never played', () => {
    expect(seriesStanding(headToHead(seasons, 'b', 'c'))).toEqual({ meetings: 0, leaderWins: 0, trailerWins: 0, ties: 0 })
  })
})

describe('lastMeeting', () => {
  it('is the latest year, then latest week — whatever order the file lists games in', () => {
    const last = lastMeeting(headToHead(seasons, 'a', 'b'))
    expect(last).toMatchObject({ year: '2024', week: 16, isPlayoff: true })
  })

  it('is undefined for a pair that never met', () => {
    expect(lastMeeting(headToHead(seasons, 'b', 'c'))).toBeUndefined()
  })
})

describe('seriesPreview', () => {
  it('carries the standing and the last meeting', () => {
    const p = seriesPreview(headToHead(seasons, 'b', 'a'))
    expect(p?.standing.leaderId).toBe('a')
    expect(p?.lastMet).toMatchObject({ year: '2024', week: 16 })
  })

  it('is null for a first meeting, never a 0–0 series', () => {
    expect(seriesPreview(headToHead(seasons, 'b', 'c'))).toBeNull()
  })
})
