import type { Tier } from '@/config/types'
import type { Game, SeasonData } from '@/data'
import { leagueWeekScoring, weekMatchups, weekNotes } from './weekRecap'

const game = (week: number, a: [string, number], b: [string, number], isPlayoff = false): Game => ({
  week,
  isPlayoff,
  participants: [
    { memberId: a[0], score: a[1] },
    { memberId: b[0], score: b[1] },
  ],
})

const season = (tier: Tier, games: Game[]): SeasonData =>
  ({ year: '2026', tier, era: 'sleeper', games, teams: [] }) as unknown as SeasonData

// One week across two leagues: a rout, a one-point finish, and a pair of games that decide the
// luckiest win (95 beats 90) and the unluckiest loss (150 loses to 151).
const seasons = [
  season('PREMIER', [
    game(1, ['rout-win', 160], ['rout-lose', 60]),
    game(1, ['edge-win', 100.5], ['edge-lose', 100.0]),
    game(2, ['next-week', 200], ['other', 10]),
  ]),
  season('MASTERS', [
    game(1, ['low-win', 95], ['low-lose', 90]),
    game(1, ['big-win', 151], ['big-lose', 150]),
    game(1, ['playoff-win', 300], ['playoff-lose', 1], true),
  ]),
]

describe('weekMatchups', () => {
  it('takes the regular-season games of that week only', () => {
    const games = weekMatchups(seasons, 1)
    expect(games).toHaveLength(4)
    expect(games.every((g) => g.week === 1)).toBe(true)
    // The playoff blowout in the same week is not a recap game.
    expect(games.map((g) => g.winnerId)).not.toContain('playoff-win')
  })

  it('puts the winner first whichever side of the game they were on', () => {
    const [rout] = weekMatchups(seasons, 1)
    expect(rout).toMatchObject({ winnerId: 'rout-win', winnerScore: 160, loserId: 'rout-lose', margin: 100, combined: 220 })
  })
})

describe('weekNotes', () => {
  const notes = weekNotes(seasons, 1)

  it('finds the rout and the nail-biter', () => {
    expect(notes.blowout?.winnerId).toBe('rout-win')
    expect(notes.blowout?.margin).toBe(100)
    expect(notes.nailbiter?.winnerId).toBe('edge-win')
    expect(notes.nailbiter?.margin).toBeCloseTo(0.5, 5)
  })

  it('finds the team robbed and the team carried', () => {
    // 150 was the week's best losing score; 95 the week's worst winning one.
    expect(notes.unluckiestLoss?.loserId).toBe('big-lose')
    expect(notes.unluckiestLoss?.loserScore).toBe(150)
    expect(notes.luckiestWin?.winnerId).toBe('low-win')
    expect(notes.luckiestWin?.winnerScore).toBe(95)
  })

  it('keeps ties out of the winner/loser stories and reports them separately', () => {
    const tied = [season('NATIONAL', [game(1, ['a', 120], ['b', 120])])]
    const withTie = weekNotes(tied, 1)
    expect(withTie.ties).toHaveLength(1)
    expect(withTie.luckiestWin).toBeUndefined()
    expect(withTie.unluckiestLoss).toBeUndefined()
    expect(withTie.blowout).toBeUndefined()
  })

  it('reports nothing for a week that has not been played', () => {
    expect(weekNotes(seasons, 9)).toMatchObject({ blowout: undefined, nailbiter: undefined, ties: [] })
  })
})

describe('leagueWeekScoring', () => {
  it('ranks the leagues by what they scored that week', () => {
    const rows = leagueWeekScoring(seasons, 1)
    // Premier: 160+60+100.5+100 = 420.5 over 4 team-games. Masters: 95+90+151+150 = 486 over 4.
    expect(rows.map((r) => [r.tier, r.rank])).toEqual([
      ['MASTERS', 1],
      ['PREMIER', 2],
    ])
    expect(rows[0]!.total).toBeCloseTo(486, 5)
    expect(rows[0]!.average).toBeCloseTo(121.5, 5)
  })

  it('leaves out a league that did not play that week', () => {
    // Only Premier has a week 2 game in this fixture.
    expect(leagueWeekScoring(seasons, 2).map((r) => r.tier)).toEqual(['PREMIER'])
  })
})
