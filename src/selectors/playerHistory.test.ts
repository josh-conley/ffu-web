import { describe, expect, it } from 'vitest'
import type { DraftData, Game, PlayerMap, SeasonData, SeasonLineups, SeasonTeam, TeamLineup } from '@/data'
import { playerAppearances, playerSummaries } from './playerAppearances'
import { playerDrafts, playerHistory, playerTitleGames } from './playerHistory'

const PLAYERS: PlayerMap = {
  p1: { name: 'Star Back', position: 'RB' },
  p2: { name: 'Depth Receiver', position: 'WR' },
}

const lu = (memberId: string, starters: [string, number][], bench: [string, number][] = []): TeamLineup => ({
  memberId,
  starters: starters.map(([playerId, points]) => ({ playerId, points })),
  bench: bench.map(([playerId, points]) => ({ playerId, points })),
})

function lineups(year: string, weeks: { week: number; teams: TeamLineup[] }[]): SeasonLineups {
  return { schemaVersion: 1, tier: 'PREMIER', year, slots: ['RB'], weeks }
}

const game = (week: number, a: string, b: string, isPlayoff = false, bracket?: Game['bracket']): Game => ({
  week,
  isPlayoff,
  bracket,
  participants: [
    { memberId: a, score: 100 },
    { memberId: b, score: 90 },
  ],
})

const team = (memberId: string, finalPlacement?: number): SeasonTeam => ({
  memberId,
  record: { wins: 0, losses: 0, ties: 0 },
  points: { for: 0, against: 0 },
  finalPlacement,
  promoted: false,
  relegated: false,
})

function season(year: string, games: Game[], champ?: string): SeasonData {
  return {
    schemaVersion: 1,
    tier: 'PREMIER',
    year,
    era: 'sleeper',
    platformLeagueId: 'x',
    teams: [team('a', champ === 'a' ? 1 : 2), team('b', champ === 'b' ? 1 : 2)],
    games,
  }
}

// 2024: a starts p1 in weeks 1 + the week-15 final (and wins the title); b benches p2 then starts him.
// 2025: p1 moves to b, who starts him once.
const LINEUPS = [
  lineups('2024', [
    { week: 1, teams: [lu('a', [['p1', 20]]), lu('b', [['x', 5]], [['p2', 3]])] },
    { week: 15, teams: [lu('a', [['p1', 31.5]]), lu('b', [['p2', 12]])] },
  ]),
  lineups('2025', [{ week: 1, teams: [lu('b', [['p1', 8]]), lu('a', [['x', 1]])] }]),
]
const SEASONS = [
  season('2024', [game(1, 'a', 'b'), game(15, 'a', 'b', true, 'championship')], 'a'),
  season('2025', [game(1, 'b', 'a')]),
]
const APPEARANCES = playerAppearances(LINEUPS, SEASONS)

describe('playerAppearances', () => {
  it('flattens starters and bench, marking playoff team-weeks', () => {
    const final = APPEARANCES.find((a) => a.playerId === 'p1' && a.week === 15)
    expect(final).toMatchObject({ year: '2024', memberId: 'a', started: true, isPlayoff: true, points: 31.5, titleGame: 'won' })
    expect(APPEARANCES.find((a) => a.playerId === 'p2' && a.week === 15)).toMatchObject({ titleGame: 'lost' })
    expect(APPEARANCES.find((a) => a.playerId === 'p2' && a.week === 1)).toMatchObject({ started: false, isPlayoff: false })
    expect(APPEARANCES.find((a) => a.playerId === 'p2' && a.week === 1)?.titleGame).toBeUndefined()
  })

  it('marks no final in a season without a champion yet — a semifinal is not the final', () => {
    const live = { ...SEASONS[0]!, teams: SEASONS[0]!.teams.map((t) => ({ ...t, finalPlacement: undefined })) }
    expect(playerAppearances(LINEUPS, [live]).some((a) => a.titleGame)).toBe(false)
  })
})

describe('playerSummaries', () => {
  it('counts only started weeks toward points, but every rostered week and season', () => {
    const [top, second] = playerSummaries(APPEARANCES, PLAYERS)
    expect(top).toMatchObject({ playerId: 'p1', name: 'Star Back', starts: 3, points: 59.5, managers: 2, seasons: 2 })
    // p2: benched once (3 pts don't count), started once for 12.
    expect(second).toMatchObject({ playerId: 'p2', starts: 1, points: 12, rosteredWeeks: 2, managers: 1 })
  })

  it('counts playoff runs, title games and titles from the games he started', () => {
    const [p1, p2] = playerSummaries(APPEARANCES, PLAYERS)
    expect(p1).toMatchObject({ playoffApps: 1, titleGames: 1, titlesWon: 1 })
    expect(p2).toMatchObject({ playoffApps: 1, titleGames: 1, titlesWon: 0 })
  })

  it('counts a playoff run once per team-season, however many rounds he started', () => {
    // A 2024 semifinal (week 14) before the week-15 final: still one run for p1.
    const semi = [{ ...LINEUPS[0]!, weeks: [...LINEUPS[0]!.weeks, { week: 14, teams: [lu('a', [['p1', 9]]), lu('b', [['p2', 4]])] }] }, LINEUPS[1]!]
    const withSemi = season('2024', [...SEASONS[0]!.games, game(14, 'a', 'b', true, 'championship')], 'a')
    const [p1] = playerSummaries(playerAppearances(semi, [withSemi, SEASONS[1]!]), PLAYERS)
    expect(p1?.playoffApps).toBe(1)
  })

  it("doesn't count consolation games as the playoffs", () => {
    const consolation = season('2025', [game(1, 'b', 'a', true, 'consolation')])
    const apps = playerAppearances(LINEUPS, [SEASONS[0]!, consolation])
    // p1 started for b in that 2025 consolation game; only his 2024 run counts.
    expect(playerSummaries(apps, PLAYERS)[0]?.playoffApps).toBe(1)
  })

  it('falls back to the raw id for a player the map does not know', () => {
    expect(playerSummaries(APPEARANCES, PLAYERS).find((s) => s.playerId === 'x')).toMatchObject({ name: 'x', position: '?' })
  })
})

describe('playerHistory', () => {
  const history = playerHistory('p1', APPEARANCES, [])

  it('groups by manager, most FFU points first', () => {
    expect(history.managers.map((m) => [m.memberId, m.points, m.years])).toEqual([
      ['a', 51.5, ['2024']],
      ['b', 8, ['2025']],
    ])
  })

  it('keeps his best started weeks, flagging playoff games', () => {
    expect(history.topWeeks[0]).toMatchObject({ week: 15, points: 31.5, isPlayoff: true })
  })

  it('returns empty lists for a player FFU never rostered', () => {
    expect(playerHistory('nobody', APPEARANCES, [])).toEqual({ managers: [], drafts: [], titleGames: [], topWeeks: [] })
  })
})

describe('playerTitleGames', () => {
  it('lists every final he started in, won or lost', () => {
    const of = (id: string) => playerTitleGames(APPEARANCES.filter((a) => a.playerId === id))
    expect(of('p1')).toEqual([{ year: '2024', tier: 'PREMIER', memberId: 'a', points: 31.5, won: true }])
    expect(of('p2')).toEqual([{ year: '2024', tier: 'PREMIER', memberId: 'b', points: 12, won: false }])
  })

  it("doesn't count a final he sat on the bench for", () => {
    const benched = LINEUPS.map((l) => ({
      ...l,
      weeks: l.weeks.map((w) => (w.week === 15 ? { ...w, teams: [lu('a', [['x', 1]], [['p1', 31.5]]), lu('b', [['p2', 12]])] } : w)),
    }))
    expect(playerTitleGames(playerAppearances(benched, SEASONS).filter((a) => a.playerId === 'p1'))).toEqual([])
  })
})

describe('playerDrafts', () => {
  const draft = (year: string, picks: [number, string, string][]): DraftData => ({
    schemaVersion: 1,
    tier: 'PREMIER',
    year,
    draftId: 'd',
    type: 'snake',
    rounds: 15,
    draftOrder: {},
    picks: picks.map(([overall, memberId, id]) => ({ overall, round: Math.ceil(overall / 12), slot: 1, memberId, player: { id, name: id, position: 'RB' } })),
  })

  it('matches picks by player id, newest year first', () => {
    const drafts = [draft('2024', [[3, 'a', 'p1']]), draft('2025', [[14, 'b', 'p1'], [1, 'a', 'p2']])]
    expect(playerDrafts('p1', drafts)).toEqual([
      { year: '2025', tier: 'PREMIER', round: 2, overall: 14, memberId: 'b' },
      { year: '2024', tier: 'PREMIER', round: 1, overall: 3, memberId: 'a' },
    ])
  })
})
