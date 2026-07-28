import type { LeagueRosterSummary, SeasonData, SeasonTeam } from '@/data'
import { upcomingRosters } from './upcomingSeason'

const team = (memberId: string, finalPlacement: number): SeasonTeam => ({
  memberId,
  record: { wins: 7, losses: 7, ties: 0 },
  points: { for: 1400, against: 1400 },
  finalPlacement,
  promoted: false,
  relegated: false,
})

/** The first member listed wins that tier-season; everyone else finishes mid-table. */
const season = (year: string, tier: SeasonData['tier'], memberIds: string[]): SeasonData => ({
  schemaVersion: 1,
  tier,
  year,
  era: 'sleeper',
  platformLeagueId: 'x',
  teams: memberIds.map((id, i) => team(id, i === 0 ? 1 : 4)),
  games: [],
})

// 2024: `lifer` wins Premier, `gone` wins National, `stayer` is in Masters. 2025 (the prior
// season): the regulars, with `stayer` winning Premier and `gone` sitting the year out.
const seasons: SeasonData[] = [
  season('2024', 'PREMIER', ['lifer']),
  season('2024', 'NATIONAL', ['gone']),
  season('2024', 'MASTERS', ['stayer']),
  season('2025', 'PREMIER', ['stayer', 'droppee', 'lifer']),
  season('2025', 'MASTERS', ['riser']),
  season('2025', 'NATIONAL', ['bigriser']),
]

const roster = (tier: LeagueRosterSummary['tier'], memberIds: string[], extra?: Partial<LeagueRosterSummary>): LeagueRosterSummary => ({
  tier,
  year: '2026',
  leagueId: 'live',
  memberIds,
  claimed: memberIds.length,
  totalRosters: memberIds.length,
  ...extra,
})

describe('upcomingRosters', () => {
  const rosters = upcomingRosters(seasons, [
    roster('PREMIER', ['stayer', 'riser', 'bigriser', 'lifer']),
    roster('NATIONAL', ['droppee', 'gone', 'rookie']),
  ])
  const by = <K extends 'movement' | 'tierStreak'>(tierIndex: number, field: K) =>
    Object.fromEntries(rosters[tierIndex]!.teams.map((t) => [t.memberId, t[field]]))

  it('labels movement against the last completed season', () => {
    expect(by(0, 'movement')).toEqual({ stayer: 'stayed', riser: 'promoted', bigriser: 'promoted', lifer: 'stayed' })
    expect(by(1, 'movement')).toEqual({ droppee: 'relegated', gone: 'returning', rookie: 'new' })
  })

  it('counts the unbroken run in the tier being lined up for', () => {
    // lifer: 2024 + 2025 Premier. stayer: only 2025 (2024 was Masters). Arrivals: 0.
    expect(by(0, 'tierStreak')).toEqual({ lifer: 2, stayer: 1, riser: 0, bigriser: 0 })
    // `gone` last played National in 2024 — sitting out 2025 breaks the run.
    expect(by(1, 'tierStreak')).toEqual({ gone: 0, droppee: 0, rookie: 0 })
  })

  it('carries where each member came from (absent for a first-timer)', () => {
    const premier = rosters[0]!.teams
    expect(premier.find((t) => t.memberId === 'riser')).toMatchObject({ fromTier: 'MASTERS', fromYear: '2025' })
    // 'returning' points at the older season actually played, not the prior one.
    expect(rosters[1]!.teams.find((t) => t.memberId === 'gone')).toMatchObject({ fromTier: 'NATIONAL', fromYear: '2024' })
    expect(rosters[1]!.teams.find((t) => t.memberId === 'rookie')?.fromTier).toBeUndefined()
  })

  it('carries the career trail: tiers played (oldest first) and championships', () => {
    const stayer = rosters[0]!.teams.find((t) => t.memberId === 'stayer')!
    expect(stayer.tiers).toEqual(['MASTERS', 'PREMIER']) // 2024 then 2025
    expect(stayer.titles).toEqual([
      { tier: 'PREMIER', year: '2025' },
      { tier: 'MASTERS', year: '2024' },
    ])
    const rookie = rosters[1]!.teams.find((t) => t.memberId === 'rookie')!
    expect(rookie).toMatchObject({ tiers: [], tierStreak: 0, titles: [] })
  })

  it('reports open slots and managers missing from the registry', () => {
    const [premier] = upcomingRosters(seasons, [roster('PREMIER', ['stayer'], { claimed: 2, totalRosters: 12 })])
    expect(premier).toMatchObject({ openSlots: 10, unregistered: 1 })
  })

  it('returns nothing when there is no completed season to compare against', () => {
    expect(upcomingRosters([], [roster('PREMIER', ['stayer'])])).toEqual([])
  })
})
