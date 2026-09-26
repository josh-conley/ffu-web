import { lineupsLabel, seriesLineText } from './seriesText'

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

describe('lineupsLabel', () => {
  it('names both teams by their name that season', () => {
    expect(lineupsLabel(['ffu-001', 'ffu-002'], '2026')).toBe('The Stallions vs FFUcked Up, view lineups')
  })

  it('says when the lineal title is on the line', () => {
    expect(lineupsLabel(['ffu-001', 'ffu-002'], '2026', true)).toBe('The Stallions vs FFUcked Up, lineal title on the line, view lineups')
  })
})
