import type { SeasonData } from '@/data'
import { buildRecordBook, teamGameRecords } from './records'

// Synthetic season with hand-picked scores so every leaderboard's ordering is checkable.
const season: SeasonData = {
  schemaVersion: 1,
  tier: 'PREMIER',
  year: '2024',
  era: 'sleeper',
  platformLeagueId: 'x',
  teams: [],
  games: [
    { week: 1, isPlayoff: false, participants: [{ memberId: 'a', score: 200 }, { memberId: 'b', score: 50 }] }, // blowout 150, combined 250
    { week: 2, isPlayoff: false, participants: [{ memberId: 'c', score: 101 }, { memberId: 'd', score: 100 }] }, // closest 1, combined 201
    { week: 3, isPlayoff: true, round: 'Championship', participants: [{ memberId: 'a', score: 120 }, { memberId: 'c', score: 120 }] }, // tie, combined 240
  ],
}

describe('buildRecordBook', () => {
  const book = buildRecordBook([season])

  it('ranks highest and lowest single-team games', () => {
    expect(book.highestGames[0]).toMatchObject({ memberId: 'a', score: 200 })
    expect(book.lowestGames[0]).toMatchObject({ memberId: 'b', score: 50 })
  })

  it('ranks biggest blowout and closest game (tie is closest)', () => {
    expect(book.biggestBlowouts[0]).toMatchObject({ margin: 150, winnerId: 'a' })
    expect(book.closestGames[0]).toMatchObject({ margin: 0, winnerId: null }) // the tie
    expect(book.closestGames[1]?.margin).toBe(1)
  })

  it('ranks highest and lowest combined matchups', () => {
    expect(book.highestCombined[0]?.combined).toBe(250)
    expect(book.lowestCombined[0]?.combined).toBe(201)
  })

  it('carries context (year/tier/week/round/opponent)', () => {
    const top = book.highestGames[0]
    expect(top).toMatchObject({ year: '2024', tier: 'PREMIER', week: 1, isPlayoff: false, opponentId: 'b' })
    expect(book.biggestBlowouts.find((m) => m.isPlayoff)?.round).toBe('Championship')
  })

  it('caps each list when a limit is given', () => {
    expect(buildRecordBook([season], 1).highestGames).toHaveLength(1)
  })

  it('emits two team-game records per game', () => {
    expect(teamGameRecords([season])).toHaveLength(season.games.length * 2)
  })
})
