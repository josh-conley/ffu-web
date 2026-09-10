import { describe, expect, it } from 'vitest'
import { divisionsOf, gamesForWeek, rosterMapOf, teamsFrom } from './sleeperSeason.mjs'

// The end-to-end proof that this mapping is right lives in the script itself:
// `npm run refresh-season -- --verify 2025` rebuilds a completed season from Sleeper and diffs it
// against the backfilled file. These tests cover the edges that a clean season never exercises.

const members = new Map([
  ['sleeper-a', { ffuId: 'ffu-001', name: 'A' }],
  ['sleeper-b', { ffuId: 'ffu-002', name: 'B' }],
])
const rosters = [
  { roster_id: 1, owner_id: 'sleeper-a', settings: { division: 1 } },
  { roster_id: 2, owner_id: 'sleeper-b', settings: { division: 2 } },
]

describe('rosterMapOf', () => {
  it('maps roster ids to ffuIds', () => {
    expect(rosterMapOf(rosters, members, 'PREMIER')).toEqual(new Map([[1, 'ffu-001'], [2, 'ffu-002']]))
  })

  it('throws rather than silently dropping an owner missing from the registry', () => {
    const withStranger = [...rosters, { roster_id: 3, owner_id: 'sleeper-zz' }]
    // Dropping them would write a season quietly missing a team — worse than failing the refresh.
    expect(() => rosterMapOf(withStranger, members, 'PREMIER')).toThrow(/sleeper-zz/)
  })

  it('throws on an abandoned roster with no owner at all', () => {
    expect(() => rosterMapOf([{ roster_id: 9, owner_id: null }], members, 'MASTERS')).toThrow(/MASTERS/)
  })
})

describe('divisionsOf', () => {
  it('reads names from league metadata', () => {
    const league = { settings: { divisions: 2 }, metadata: { division_1: 'Diamond', division_2: 'Platinum' } }
    expect(divisionsOf(league, rosters).names).toEqual([{ id: 1, name: 'Diamond' }, { id: 2, name: 'Platinum' }])
  })

  it('falls back to a generic name when the commissioner never set one', () => {
    const league = { settings: { divisions: 2 }, metadata: {} }
    expect(divisionsOf(league, rosters).names[1]).toEqual({ id: 2, name: 'Division 2' })
  })

  it('is null for a league with no divisions', () => {
    expect(divisionsOf({ settings: { divisions: 0 } }, rosters)).toBeNull()
    expect(divisionsOf({ settings: {} }, rosters)).toBeNull()
  })
})

describe('gamesForWeek', () => {
  const rosterMap = new Map([[1, 'ffu-001'], [2, 'ffu-002']])

  it('pairs entries sharing a matchup_id', () => {
    const entries = [
      { roster_id: 1, matchup_id: 7, points: 101.5 },
      { roster_id: 2, matchup_id: 7, points: 99.25 },
    ]
    expect(gamesForWeek(entries, 3, rosterMap)).toEqual([
      { week: 3, isPlayoff: false, participants: [{ memberId: 'ffu-001', score: 101.5 }, { memberId: 'ffu-002', score: 99.25 }] },
    ])
  })

  it('skips byes (a null matchup_id) instead of inventing an opponent', () => {
    expect(gamesForWeek([{ roster_id: 1, matchup_id: null, points: 88 }], 3, rosterMap)).toEqual([])
  })

  it('skips a group that is not exactly two teams', () => {
    const odd = [{ roster_id: 1, matchup_id: 7, points: 88 }]
    expect(gamesForWeek(odd, 3, rosterMap)).toEqual([])
  })

  it('treats a missing points field as zero rather than undefined', () => {
    const entries = [{ roster_id: 1, matchup_id: 1 }, { roster_id: 2, matchup_id: 1, points: 50 }]
    expect(gamesForWeek(entries, 1, rosterMap)[0].participants[0].score).toBe(0)
  })
})

describe('teamsFrom', () => {
  const rosterMap = new Map([[1, 'ffu-001'], [2, 'ffu-002']])
  const game = (week, a, b) => ({ week, isPlayoff: false, participants: [{ memberId: 'ffu-001', score: a }, { memberId: 'ffu-002', score: b }] })

  it('derives records and points from the games, both sides', () => {
    const [one, two] = teamsFrom([game(1, 100, 90), game(2, 80, 120)], rosterMap, null)
    expect(one.record).toEqual({ wins: 1, losses: 1, ties: 0 })
    expect(one.points).toEqual({ for: 180, against: 210 })
    expect(two.record).toEqual({ wins: 1, losses: 1, ties: 0 })
    expect(two.points).toEqual({ for: 210, against: 180 })
  })

  it('counts an exact tie as a tie for both teams', () => {
    const [one, two] = teamsFrom([game(1, 100, 100)], rosterMap, null)
    expect(one.record).toEqual({ wins: 0, losses: 0, ties: 1 })
    expect(two.record).toEqual({ wins: 0, losses: 0, ties: 1 })
  })

  it('leaves finalPlacement absent — that is how the site knows the season is unfinished', () => {
    const [one] = teamsFrom([game(1, 100, 90)], rosterMap, null)
    expect(one).not.toHaveProperty('finalPlacement')
    expect(one).not.toHaveProperty('placementName')
    expect(one.promoted).toBe(false)
    expect(one.relegated).toBe(false)
  })

  it('gives every team a row before a single game is played', () => {
    const rows = teamsFrom([], rosterMap, null)
    expect(rows).toHaveLength(2)
    expect(rows[0].record).toEqual({ wins: 0, losses: 0, ties: 0 })
    expect(rows[0].points).toEqual({ for: 0, against: 0 })
  })

  it('rounds away float drift from summing weekly scores', () => {
    const [one] = teamsFrom([game(1, 0.1, 0), game(2, 0.2, 0)], rosterMap, null)
    expect(one.points.for).toBe(0.3) // not 0.30000000000000004
  })

  it('attaches divisionId by roster, not by member order', () => {
    const divisions = divisionsOf({ settings: { divisions: 2 }, metadata: {} }, rosters)
    const [one, two] = teamsFrom([], rosterMap, divisions)
    expect(one.divisionId).toBe(1)
    expect(two.divisionId).toBe(2)
  })
})
