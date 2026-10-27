import { lineupsLabel, meetingWhen, seriesLineFor, seriesLineText } from './seriesText'

// ffu-001 is The Stallions (STA), ffu-002 FFUcked Up, in the member registry.
const meeting = { year: '2024', tier: 'PREMIER' as const, week: 9, isPlayoff: false, score: 1, opponentScore: 0, result: 'W' as const }

describe('seriesLineText', () => {
  it('names the leader by abbreviation and when the pair last met', () => {
    const standing = { meetings: 6, leaderId: 'ffu-001', leaderWins: 4, trailerWins: 2, ties: 0 }
    expect(seriesLineText({ standing, lastMet: meeting })).toBe('STA leads 4–2 · last met 2024 Wk 9')
  })

  it('calls a playoff meeting the playoffs, and a level series tied (ties counted)', () => {
    const standing = { meetings: 5, leaderWins: 2, trailerWins: 2, ties: 1 }
    expect(seriesLineText({ standing, lastMet: { ...meeting, week: 16, isPlayoff: true } })).toBe(
      'Series tied 2–2–1 · last met in the 2024 playoffs',
    )
  })
})

describe('seriesLineFor', () => {
  it('gives every card one line: the series, a first meeting, or nothing while loading', () => {
    const standing = { meetings: 6, leaderId: 'ffu-001', leaderWins: 4, trailerWins: 2, ties: 0 }
    expect(seriesLineFor({ standing, lastMet: meeting })).toBe('STA leads 4–2 · last met 2024 Wk 9')
    expect(seriesLineFor(null)).toBe('First meeting')
    expect(seriesLineFor(undefined)).toBeUndefined()
  })
})

describe('lineupsLabel', () => {
  it('names both teams by their name that season', () => {
    expect(lineupsLabel(['ffu-001', 'ffu-002'], '2026')).toBe('The Stallions vs FFUcked Up, view lineups')
  })
})

describe('meetingWhen', () => {
  it('names a Cup game by its round, a playoff by its round, and a regular-season game by its week', () => {
    expect(meetingWhen({ ...meeting, year: '2026', cup: { round: 'Round of 18', leagueGame: false } })).toBe('2026 Cup Round of 18')
    expect(meetingWhen({ ...meeting, isPlayoff: true, round: 'Championship' })).toBe('2024 Championship')
    expect(meetingWhen(meeting, ' · ')).toBe('2024 · Wk 9')
  })

  it('says a pair last met in the Cup', () => {
    const standing = { meetings: 1, leaderId: 'ffu-001', leaderWins: 1, trailerWins: 0, ties: 0 }
    const lastMet = { ...meeting, year: '2026', cup: { round: 'Final', leagueGame: false } }
    expect(seriesLineText({ standing, lastMet })).toBe('STA leads 1–0 · last met in the 2026 Cup')
  })
})
