import type { SeasonLineups } from '@/data'
import { latestRoster } from './latestRoster'

const lineups: SeasonLineups = {
  schemaVersion: 1,
  tier: 'PREMIER',
  year: '2026',
  slots: ['QB', 'RB', 'FLEX'],
  weeks: [
    { week: 1, teams: [{ memberId: 'a', starters: [{ playerId: 'old', points: 1 }, null, null], bench: [] }] },
    {
      week: 2,
      teams: [
        { memberId: 'a', starters: [{ playerId: 'qb', points: 1 }, null, { playerId: 'wr', points: 2 }], bench: [{ playerId: 'rb', points: 0 }], reserve: [{ playerId: 'hurt', points: 0 }] },
      ],
    },
    { week: 3, teams: [{ memberId: 'b', starters: [null, null, null], bench: [] }] },
  ],
}

it("reads the team's latest lineup on file: starters by slot, then bench and IR", () => {
  expect(latestRoster(lineups, 'a')).toEqual({
    week: 2,
    spots: [
      { slot: 'QB', playerId: 'qb' },
      { slot: 'FLEX', playerId: 'wr' },
      { slot: 'BN', playerId: 'rb' },
      { slot: 'IR', playerId: 'hurt' },
    ],
  })
  expect(latestRoster(lineups, 'nobody')).toBeUndefined()
})
