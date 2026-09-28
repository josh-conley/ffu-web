import type { Game, SeasonData, SeasonTeam } from '@/data'
import { playoffBaseRates, recordKey } from './playoffBaseRates'

const team = (memberId: string, finalPlacement?: number): SeasonTeam => ({
  memberId,
  record: { wins: 0, losses: 0, ties: 0 },
  points: { for: 0, against: 0 },
  ...(finalPlacement === undefined ? {} : { finalPlacement }),
  promoted: false,
  relegated: false,
})
const game = (week: number, a: string, aScore: number, b: string, bScore: number, extra?: Partial<Game>): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: a, score: aScore },
    { memberId: b, score: bScore },
  ],
  ...extra,
})
const season = (year: string, teams: SeasonTeam[], games: Game[]): SeasonData => ({
  schemaVersion: 1,
  tier: 'PREMIER',
  year,
  era: 'sleeper',
  platformLeagueId: 'x',
  teams,
  games,
})

describe('recordKey', () => {
  it('shows a tie only when there is one', () => {
    expect(recordKey({ wins: 2, losses: 1, ties: 0 })).toBe('2-1')
    expect(recordKey({ wins: 2, losses: 0, ties: 1 })).toBe('2-0-1')
  })
})

describe('playoffBaseRates', () => {
  const finished = season(
    '2022',
    [team('a', 1), team('b', 2), team('c', 3), team('d', 4)],
    [
      game(1, 'a', 100, 'b', 90),
      game(1, 'c', 100, 'd', 90),
      game(2, 'a', 100, 'c', 90),
      game(2, 'b', 100, 'd', 90),
      game(3, 'a', 100, 'b', 90, { isPlayoff: true, bracket: 'championship' }),
    ],
  )
  const unfinished = season('2026', [team('a'), team('b')], [game(1, 'a', 100, 'b', 90)])

  it('counts each record after the week, and how many of those teams reached the bracket', () => {
    const rates = playoffBaseRates([finished, unfinished], 2)
    expect(rates.byRecord.get('2-0')).toEqual({ made: 1, total: 1 })
    expect(rates.byRecord.get('1-1')).toEqual({ made: 1, total: 2 })
    expect(rates.byRecord.get('0-2')).toEqual({ made: 0, total: 1 })
  })

  it('leaves out a season still being played, and names the earliest one counted', () => {
    const rates = playoffBaseRates([unfinished, finished], 1)
    expect(rates.since).toBe('2022')
    expect([...rates.byRecord.values()].reduce((n, r) => n + r.total, 0)).toBe(4)
  })

  it('says nothing when there is nothing to count', () => {
    expect(playoffBaseRates([unfinished], 1)).toEqual({ week: 1, byRecord: new Map() })
  })
})

describe('playoffBaseRates over the real archive', () => {
  const files = import.meta.glob<SeasonData>('../../public/data/*/*.json', { eager: true, import: 'default' })
  const seasons = Object.entries(files)
    .filter(([path]) => /\/(premier|masters|national)\.json$/.test(path))
    .map(([, s]) => s)
  const rates = playoffBaseRates(seasons, 3)
  const finishedSeasons = seasons.filter((s) => s.teams.every((t) => t.finalPlacement !== undefined))

  it('counts every team of every finished season once, and six playoff teams from each', () => {
    const all = [...rates.byRecord.values()]
    expect(all.reduce((n, r) => n + r.total, 0)).toBe(finishedSeasons.length * 12)
    expect(all.reduce((n, r) => n + r.made, 0)).toBe(finishedSeasons.length * 6)
    expect(rates.since).toBe('2018')
  })
})
