import { describe, expect, it } from 'vitest'
import type { DraftData, DraftPick, SeasonData, SeasonTeam } from '@/data'
import type { Tier } from '@/config/types'
import { analyzeBuilds, buildKey, buildLabel, orderedPositions, teamBuilds } from './draftBuilds'

function pick(overall: number, round: number, memberId: string, position: string): DraftPick {
  return { overall, round, slot: overall, memberId, player: { id: `p${overall}`, name: `Player ${overall}`, position } }
}

function draft(tier: Tier, year: string, picks: DraftPick[]): DraftData {
  return { schemaVersion: 1, tier, year, draftId: `${tier}-${year}`, type: 'snake', rounds: 3, draftOrder: {}, picks }
}

/** A season built from a member→final-placement map (season size = number of teams). Empty = unfinished. */
function season(tier: Tier, year: string, placements: Record<string, number>): SeasonData {
  const teams: SeasonTeam[] = Object.entries(placements).map(([memberId, finalPlacement]) => ({
    memberId,
    record: { wins: 0, losses: 0, ties: 0 },
    points: { for: 0, against: 0 },
    finalPlacement,
    promoted: false,
    relegated: false,
  }))
  return { schemaVersion: 1, tier, year, era: 'sleeper', platformLeagueId: 'x', teams, games: [] }
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
  // Two seasons, four teams sharing two build shapes; one of each build finishes in the top 6.
  const drafts = [
    draft('PREMIER', '2022', [pick(1, 1, 'w', 'RB'), pick(2, 1, 'x', 'WR'), pick(3, 2, 'w', 'RB'), pick(4, 2, 'x', 'WR')]),
    draft('PREMIER', '2023', [pick(1, 1, 'y', 'RB'), pick(2, 1, 'z', 'WR'), pick(3, 2, 'y', 'RB'), pick(4, 2, 'z', 'WR')]),
  ]
  // w & z finish top-6 (place 3); x & y finish out of it (place 8).
  const seasons = [season('PREMIER', '2022', { w: 3, x: 8 }), season('PREMIER', '2023', { y: 8, z: 3 })]

  it('aggregates identical builds and computes finish rates + a baseline', () => {
    const res = analyzeBuilds(drafts, seasons, 2)
    expect(res.totalTeams).toBe(4)
    expect(res.successTeams).toBe(2)
    expect(res.baselinePct).toBe(0.5)

    const rb = res.builds.find((b) => b.key === 'RB2')
    expect(rb).toMatchObject({ teams: 2, successTeams: 1, successPct: 0.5 })
    const wr = res.builds.find((b) => b.key === 'WR2')
    expect(wr).toMatchObject({ teams: 2, successTeams: 1, successPct: 0.5 })
    expect(rb?.edge).toBe(0)
  })

  it('respects a tighter cutoff (top-3 excludes the place-8 finishers only, but here changes nothing)', () => {
    // Lower the cutoff to 2 → nobody at place 3 qualifies, so every build drops to 0%.
    const res = analyzeBuilds(drafts, seasons, 2, undefined, undefined, 2)
    expect(res.successTeams).toBe(0)
    expect(res.baselinePct).toBe(0)
    expect(res.builds.every((b) => b.successPct === 0)).toBe(true)
  })

  it('excludes seasons with no placements recorded (unfinished)', () => {
    const withUnfinished = [...seasons, season('PREMIER', '2024', {})]
    const draftsPlus = [...drafts, draft('PREMIER', '2024', [pick(1, 1, 'u', 'QB'), pick(2, 2, 'u', 'QB')])]
    const res = analyzeBuilds(draftsPlus, withUnfinished, 2)
    expect(res.totalTeams).toBe(4) // the 2024 QB team is not counted
    expect(res.builds.some((b) => b.key === 'QB2')).toBe(false)
  })

  it('counts 1st-place and last-place finishers per build', () => {
    // Both teams drafted RB3; p wins the title, q comes dead last (of 2).
    const rbDraft = draft('PREMIER', '2021', [pick(1, 1, 'p', 'RB'), pick(2, 1, 'q', 'RB'), pick(3, 2, 'p', 'RB'), pick(4, 2, 'q', 'RB'), pick(5, 3, 'p', 'RB'), pick(6, 3, 'q', 'RB')])
    const res = analyzeBuilds([rbDraft], [season('PREMIER', '2021', { p: 1, q: 2 })], 3)
    const rb3 = res.builds.find((b) => b.key === 'RB3')!
    expect(rb3).toMatchObject({ teams: 2, firsts: 1, lasts: 1 })
  })

  it('carries the team-season instances (with rosters + placement) behind each build', () => {
    const res = analyzeBuilds(drafts, seasons, 2)
    const rb = res.builds.find((b) => b.key === 'RB2')!
    expect(rb.instances).toHaveLength(2)
    const inst2023 = rb.instances.find((i) => i.year === '2023')!
    expect(inst2023.memberId).toBe('y')
    expect(inst2023.finalPlacement).toBe(8) // 'y' finished 8th in 2023
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
  const s = [season('PREMIER', '2023', { a: 1, b: 8 })] // 'a' wins, 'b' misses

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
    expect(rb.successTeams).toBe(1) // only 'a' finished top-6
    // the roster still shows every pick, not just the counted position
    expect(rb.instances[0]!.picks).toHaveLength(3)
  })

  it('labels the "none of the selected positions" bucket explicitly', () => {
    const res = analyzeBuilds([d], s, 3, ['QB'])
    expect(res.builds).toHaveLength(1)
    expect(res.builds[0]!.label).toBe('0 QB') // neither team drafted a QB early
  })

  it('restricts the whole sample (and baseline) to the given members', () => {
    // Only team 'a' (made playoffs) → sample of one, baseline 100%.
    const res = analyzeBuilds([d], s, 3, ['QB', 'RB', 'WR', 'TE'], ['a'])
    expect(res.totalTeams).toBe(1)
    expect(res.baselinePct).toBe(1)
    expect(res.builds).toHaveLength(1)
    expect(res.builds[0]!.instances.every((i) => i.memberId === 'a')).toBe(true)
  })

  it('an empty member list means no restriction', () => {
    const res = analyzeBuilds([d], s, 3, ['QB', 'RB', 'WR', 'TE'], [])
    expect(res.totalTeams).toBe(2)
  })
})
