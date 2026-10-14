import type { Game, LiveSeasonData, Tournament } from '@/data'
import type { Tier } from '@/config/types'
import { cupMatchupGame, liveCupRounds } from './liveCup'

// Each team's live score per week, paired with a throwaway opponent (only the team's own score counts).
function live(tier: Tier, scores: Record<string, Record<number, number>>, currentWeek = 7): LiveSeasonData {
  const games: Game[] = []
  for (const [ffuId, byWeek] of Object.entries(scores)) {
    for (const [week, score] of Object.entries(byWeek)) {
      games.push({ week: Number(week), isPlayoff: false, participants: [{ memberId: ffuId, score }, { memberId: `${ffuId}-opp`, score: 0 }] })
    }
  }
  return { tier, year: '2026', leagueId: `L-${tier}`, currentWeek, memberIds: Object.keys(scores), games }
}

const cup: Tournament = {
  schemaVersion: 1,
  name: 'FFU Cup',
  year: '2026',
  fieldSize: 4,
  participants: [
    { ffuId: 'a', tier: 'PREMIER', seed: 1 },
    { ffuId: 'b', tier: 'MASTERS', seed: 4 },
    { ffuId: 'c', tier: 'PREMIER', seed: 2 },
    { ffuId: 'd', tier: 'NATIONAL', seed: 3 },
  ],
  rounds: [
    { key: 'r4', label: 'Semifinals', week: 6, matchups: [{ a: 'a', b: 'b' }, { a: 'c', b: 'd' }] },
    { key: 'final', label: 'Final', week: 7 },
  ],
}

const seasons = [live('PREMIER', { a: { 6: 100, 7: 40 }, c: { 6: 80 } }), live('MASTERS', { b: { 6: 90 } }), live('NATIONAL', { d: { 6: 120 } })]

it("resolves the round in the week on show from the live games, across leagues", () => {
  const [round] = liveCupRounds(cup, seasons, [6])
  expect(round?.label).toBe('Semifinals')
  expect(round?.matchups.map((m) => m.winner)).toEqual(['a', 'd'])
})

it('pairs the next round as soon as the live games decide the one before', () => {
  const rounds = liveCupRounds(cup, seasons, [6, 7])
  expect(rounds.map((r) => r.key)).toEqual(['r4', 'final'])
  const final = rounds[1]!.matchups[0]!
  expect([final.a.ffuId, final.b.ffuId]).toEqual(['a', 'd'])
  // d's week-7 game hasn't started: no score yet, so 0 on the card.
  expect(cupMatchupGame(final, 7).participants).toEqual([
    { memberId: 'a', score: 40 },
    { memberId: 'd', score: 0 },
  ])
})

it('leaves out a round whose field is not known yet', () => {
  const undecided = [live('PREMIER', { a: { 6: 100 }, c: { 6: 80 } }), live('MASTERS', { b: { 6: 90 } }), live('NATIONAL', {})]
  expect(liveCupRounds(cup, undecided, [7])).toEqual([])
})

it("is empty with no Cup round those weeks, before the draw, or for another season's Cup", () => {
  expect(liveCupRounds(cup, seasons, [5])).toEqual([])
  expect(liveCupRounds({ ...cup, participants: [] }, seasons, [6])).toEqual([])
  expect(liveCupRounds({ ...cup, year: '2025' }, seasons, [6])).toEqual([])
  expect(liveCupRounds(undefined, seasons, [6])).toEqual([])
})
