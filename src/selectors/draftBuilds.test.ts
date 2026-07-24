import { describe, expect, it } from 'vitest'
import type { DraftData, DraftPick, Game, SeasonData } from '@/data'
import type { Tier } from '@/config/types'
import { analyzeBuilds, buildKey, buildLabel, orderedPositions, teamBuilds } from './draftBuilds'

function pick(overall: number, round: number, memberId: string, position: string): DraftPick {
  return { overall, round, slot: overall, memberId, player: { id: `p${overall}`, name: `Player ${overall}`, position } }
}

function draft(tier: Tier, year: string, picks: DraftPick[]): DraftData {
  return { schemaVersion: 1, tier, year, draftId: `${tier}-${year}`, type: 'snake', rounds: 3, draftOrder: {}, picks }
}

/** A championship-bracket game marks both participants as playoff teams. */
function champGame(a: string, b: string): Game {
  return { week: 15, isPlayoff: true, bracket: 'championship', participants: [{ memberId: a, score: 100 }, { memberId: b, score: 90 }] }
}

function season(tier: Tier, year: string, games: Game[]): SeasonData {
  return { schemaVersion: 1, tier, year, era: 'sleeper', platformLeagueId: 'x', teams: [], games }
}

describe('build key / label formatting', () => {
  it('orders positions canonically (QB, RB, WR, TE, …) regardless of insertion order', () => {
    const counts = { WR: 1, RB: 2 }
    expect(orderedPositions(counts)).toEqual(['RB', 'WR'])
    expect(buildKey(counts)).toBe('RB2-WR1')
    expect(buildLabel(counts)).toBe('2 RB · 1 WR')
  })

  it('drops zero-count positions and sorts unknown positions after the known ones', () => {
    expect(buildKey({ RB: 1, WR: 0, DB: 1 })).toBe('RB1-DB1')
  })
})

describe('teamBuilds', () => {
  const d = draft('PREMIER', '2023', [
    pick(1, 1, 'a', 'RB'),
    pick(2, 1, 'b', 'WR'),
    pick(3, 2, 'a', 'RB'),
    pick(4, 2, 'b', 'RB'),
    pick(5, 3, 'a', 'WR'),
    pick(6, 3, 'b', 'TE'),
    pick(7, 4, 'a', 'QB'), // beyond a 3-round threshold — excluded
  ])

  it('counts only picks within the round threshold', () => {
    const builds = teamBuilds(d, 3)
    expect(builds.get('a')).toEqual({ RB: 2, WR: 1 })
    expect(builds.get('b')).toEqual({ WR: 1, RB: 1, TE: 1 })
  })

  it('narrowing the threshold shrinks each build', () => {
    expect(teamBuilds(d, 2).get('a')).toEqual({ RB: 2 })
  })
})

describe('analyzeBuilds', () => {
  // Two seasons, four teams sharing two build shapes; one of each build makes the playoffs.
  const drafts = [
    draft('PREMIER', '2022', [pick(1, 1, 'w', 'RB'), pick(2, 1, 'x', 'WR'), pick(3, 2, 'w', 'RB'), pick(4, 2, 'x', 'WR')]),
    draft('PREMIER', '2023', [pick(1, 1, 'y', 'RB'), pick(2, 1, 'z', 'WR'), pick(3, 2, 'y', 'RB'), pick(4, 2, 'z', 'WR')]),
  ]
  const seasons = [season('PREMIER', '2022', [champGame('w', 'q')]), season('PREMIER', '2023', [champGame('z', 'q')])]

  it('aggregates identical builds and computes playoff rates + a baseline', () => {
    const res = analyzeBuilds(drafts, seasons, 2)
    expect(res.totalTeams).toBe(4)
    expect(res.playoffTeams).toBe(2)
    expect(res.baselinePct).toBe(0.5)

    const rb = res.builds.find((b) => b.key === 'RB2')
    expect(rb).toMatchObject({ teams: 2, playoffTeams: 1, playoffPct: 0.5 })
    const wr = res.builds.find((b) => b.key === 'WR2')
    expect(wr).toMatchObject({ teams: 2, playoffTeams: 1, playoffPct: 0.5 })
    expect(rb?.edge).toBe(0)
  })

  it('excludes seasons with no championship bracket recorded (unfinished)', () => {
    const withUnfinished = [...seasons, season('PREMIER', '2024', [])]
    const draftsPlus = [...drafts, draft('PREMIER', '2024', [pick(1, 1, 'u', 'QB'), pick(2, 2, 'u', 'QB')])]
    const res = analyzeBuilds(draftsPlus, withUnfinished, 2)
    expect(res.totalTeams).toBe(4) // the 2024 QB team is not counted
    expect(res.builds.some((b) => b.key === 'QB2')).toBe(false)
  })

  it('carries the team-season instances (with rosters) behind each build', () => {
    const res = analyzeBuilds(drafts, seasons, 2)
    const rb = res.builds.find((b) => b.key === 'RB2')!
    expect(rb.instances).toHaveLength(2)
    const inst2023 = rb.instances.find((i) => i.year === '2023')!
    expect(inst2023.memberId).toBe('y')
    expect(inst2023.madePlayoffs).toBe(false) // only 'z' made it in 2023
    expect(inst2023.picks.map((p) => p.player.position)).toEqual(['RB', 'RB'])
    // instances are sorted newest-first
    expect(rb.instances.map((i) => i.year)).toEqual(['2023', '2022'])
  })
})

describe('analyzeBuilds — position filter', () => {
  // Two teams share 2 RB but differ in the third pick (WR vs TE). Restricting to RB merges them.
  const d = draft('PREMIER', '2023', [
    pick(1, 1, 'a', 'RB'), pick(2, 1, 'b', 'RB'),
    pick(3, 2, 'a', 'RB'), pick(4, 2, 'b', 'RB'),
    pick(5, 3, 'a', 'WR'), pick(6, 3, 'b', 'TE'),
  ])
  const s = [season('PREMIER', '2023', [champGame('a', 'q')])]

  it('with all positions, "2 RB 1 WR" and "2 RB 1 TE" are distinct builds', () => {
    const res = analyzeBuilds([d], s, 3, ['QB', 'RB', 'WR', 'TE'])
    expect(res.builds.map((b) => b.key).sort()).toEqual(['RB2-TE1', 'RB2-WR1'])
  })

  it('restricting to RB merges them into a single "2 RB" bucket', () => {
    const res = analyzeBuilds([d], s, 3, ['RB'])
    expect(res.builds).toHaveLength(1)
    const rb = res.builds[0]!
    expect(rb.key).toBe('RB2')
    expect(rb.label).toBe('2 RB')
    expect(rb.teams).toBe(2)
    expect(rb.playoffTeams).toBe(1) // only 'a' made playoffs
    // the roster still shows every pick, not just the counted position
    expect(rb.instances[0]!.picks).toHaveLength(3)
  })

  it('labels the "none of the selected positions" bucket explicitly', () => {
    const res = analyzeBuilds([d], s, 3, ['QB'])
    expect(res.builds).toHaveLength(1)
    expect(res.builds[0]!.label).toBe('0 QB') // neither team drafted a QB early
  })
})
