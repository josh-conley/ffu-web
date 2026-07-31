import type { Game, SeasonData, SeasonTeam } from '@/data'
import type { Tier } from '@/config/types'
import { linealHistory, linealHolderTotals } from './lineal'

// Synthetic seasons keep the lineage rules explicit; a final smoke test walks the real data.

const team = (memberId: string, finalPlacement?: number): SeasonTeam => ({
  memberId,
  record: { wins: 0, losses: 0, ties: 0 },
  points: { for: 0, against: 0 },
  finalPlacement,
  promoted: false,
  relegated: false,
})

const game = (week: number, a: string, aScore: number, b: string, bScore: number, round?: string): Game => ({
  week,
  isPlayoff: round !== undefined,
  round,
  bracket: round === undefined ? undefined : 'championship',
  participants: [
    { memberId: a, score: aScore },
    { memberId: b, score: bScore },
  ],
})

const season = (year: string, tier: Tier, teams: SeasonTeam[], games: Game[]): SeasonData => ({
  schemaVersion: 1,
  tier,
  year,
  era: 'sleeper',
  platformLeagueId: `${tier}-${year}`,
  teams,
  games,
})

/** 2018 Premier: A wins the first title over B in week 3 — the belt is born. */
const origin = season(
  '2018',
  'PREMIER',
  [team('A', 1), team('B', 2)],
  [game(1, 'A', 100, 'B', 90), game(3, 'A', 120, 'B', 110, 'Championship')],
)

describe('linealHistory', () => {
  it('starts the lineage with the first top-flight champion, at their title game', () => {
    const { reigns, origin: at, currentChampionId } = linealHistory([origin])
    expect(reigns).toHaveLength(1)
    expect(reigns[0]).toMatchObject({ order: 1, championId: 'A', wonFrom: null, defenses: 0, current: true })
    expect(at).toMatchObject({ year: '2018', week: 3, round: 'Championship' })
    expect(currentChampionId).toBe('A')
  })

  it('does not count the origin title game (or anything before it) as a defense', () => {
    const { reigns } = linealHistory([origin])
    expect(reigns[0]?.titleGames).toHaveLength(0)
  })

  it('passes the belt to whoever beats the holder, and counts survived games as defenses', () => {
    const next = season(
      '2019',
      'PREMIER',
      [team('A'), team('B'), team('C')],
      [game(1, 'A', 100, 'B', 90), game(2, 'A', 80, 'C', 95), game(3, 'C', 70, 'B', 60)],
    )
    const { reigns, currentChampionId } = linealHistory([origin, next])

    expect(reigns.map((r) => r.championId)).toEqual(['A', 'C'])
    expect(reigns[0]).toMatchObject({ defenses: 1, lostTo: 'C', current: false })
    expect(reigns[0]?.lostAt).toMatchObject({ year: '2019', week: 2 })
    expect(reigns[1]).toMatchObject({ order: 2, championId: 'C', wonFrom: 'A', defenses: 1, current: true })
    expect(currentChampionId).toBe('C')
  })

  it('retains the belt on a tie (a draw is a defense, not a title change)', () => {
    const next = season('2019', 'PREMIER', [team('A'), team('B')], [game(1, 'A', 100, 'B', 100)])
    const { reigns, currentChampionId } = linealHistory([origin, next])

    expect(reigns).toHaveLength(1)
    expect(reigns[0]).toMatchObject({ championId: 'A', defenses: 1 })
    expect(reigns[0]?.titleGames[0]?.outcome).toBe('drawn')
    expect(currentChampionId).toBe('A')
  })

  it('puts the belt on the line in playoff AND consolation games alike', () => {
    const next = season(
      '2019',
      'PREMIER',
      [team('A'), team('B')],
      [{ ...game(15, 'A', 80, 'B', 99, 'Toilet Bowl Semifinal'), bracket: 'consolation' }],
    )
    const { reigns } = linealHistory([origin, next])
    expect(reigns[1]).toMatchObject({ championId: 'B', wonFrom: 'A' })
    expect(reigns[1]?.wonAt.round).toBe('Toilet Bowl Semifinal')
  })

  it('follows the holder into another tier', () => {
    const relegated = season('2019', 'NATIONAL', [team('A'), team('Z')], [game(1, 'A', 70, 'Z', 120)])
    const elsewhere = season('2019', 'PREMIER', [team('B'), team('C')], [game(1, 'B', 150, 'C', 140)])
    const { reigns, currentChampionId } = linealHistory([origin, relegated, elsewhere])

    expect(currentChampionId).toBe('Z')
    expect(reigns[1]?.wonAt.tier).toBe('NATIONAL')
  })

  it('keeps the belt with an idle holder (weeks played by others are not title games)', () => {
    const next = season('2019', 'PREMIER', [team('B'), team('C')], [game(1, 'B', 100, 'C', 90), game(2, 'B', 80, 'C', 95)])
    const { reigns, currentChampionId } = linealHistory([origin, next])

    expect(currentChampionId).toBe('A')
    expect(reigns[0]).toMatchObject({ defenses: 0, current: true })
  })

  it('measures a reign in league weeks, counting weeks the holder sat out', () => {
    // Week slots: 2018 w1, w3, then 2019 w1, w2, w3 → A holds from slot 1 to slot 3 (lost 2019 w2).
    const next = season(
      '2019',
      'PREMIER',
      [team('A'), team('B'), team('C')],
      [game(1, 'B', 100, 'C', 90), game(2, 'A', 80, 'C', 95), game(3, 'C', 70, 'B', 60)],
    )
    const { reigns } = linealHistory([origin, next])
    expect(reigns[0]?.weeksHeld).toBe(2)
    expect(reigns[1]?.weeksHeld).toBe(1) // 2019 w2 → the last week in the data
  })

  it('returns an empty lineage when no champion has been crowned yet', () => {
    const unfinished = season('2018', 'PREMIER', [team('A'), team('B')], [game(1, 'A', 100, 'B', 90)])
    expect(linealHistory([unfinished])).toEqual({ reigns: [], currentChampionId: null, origin: null })
    expect(linealHistory([])).toEqual({ reigns: [], currentChampionId: null, origin: null })
  })
})

describe('linealHolderTotals', () => {
  it('sums separate reigns per member and tracks their longest', () => {
    const next = season(
      '2019',
      'PREMIER',
      [team('A'), team('B'), team('C')],
      // A loses it to B in w1, B loses it to A in w2, A loses it to C in w3 → A has two reigns.
      [game(1, 'A', 80, 'B', 95), game(2, 'B', 70, 'A', 100), game(3, 'A', 60, 'C', 90)],
    )
    const { reigns } = linealHistory([origin, next])
    const totals = linealHolderTotals(reigns)
    const a = totals.find((t) => t.memberId === 'A')

    expect(reigns.map((r) => r.championId)).toEqual(['A', 'B', 'A', 'C'])
    expect(a).toMatchObject({ reigns: 2, weeksHeld: 2, longestReign: 1, current: false })
    expect(a?.firstWon).toMatchObject({ year: '2018', week: 3 })
    expect(totals.find((t) => t.memberId === 'C')?.current).toBe(true)
  })
})
