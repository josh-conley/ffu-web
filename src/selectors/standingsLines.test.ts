import type { PlayoffFormat } from '@/config'
import type { Game, LiveSeasonData, SeasonData, SeasonTeam } from '@/data'
import { standingsThroughPreviousWeek } from './liveWeek'
import type { PlayoffBaseRates } from './playoffBaseRates'
import {
  baseRateFor,
  divisionsOf,
  firstOutside,
  hasRelegation,
  inPictureOrder,
  leaguesAddedAfter,
  livePlayoffPicture,
  seasonPlayoffPicture,
  tierMove,
} from './standingsLines'
import premier2025 from '../../public/data/2025/premier.json'

const FORMAT: PlayoffFormat = { teams: 2, tiebreak: 'head-to-head' }

const team = (memberId: string, divisionId: number, wins: number, losses: number, extra?: Partial<SeasonTeam>): SeasonTeam => ({
  memberId,
  divisionId,
  record: { wins, losses, ties: 0 },
  points: { for: 100, against: 100 },
  promoted: false,
  relegated: false,
  ...extra,
})
const game = (week: number, a: string, aScore: number, b: string, bScore: number): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: a, score: aScore },
    { memberId: b, score: bScore },
  ],
})
const season = (teams: SeasonTeam[], games: Game[]): SeasonData => ({
  schemaVersion: 1,
  tier: 'NATIONAL',
  year: '2026',
  era: 'sleeper',
  platformLeagueId: 'x',
  teams,
  games,
})

describe('tierMove', () => {
  it('reads the stored flags', () => {
    expect(tierMove(team('a', 1, 0, 0, { promoted: true }))).toBe('promoted')
    expect(tierMove(team('a', 1, 0, 0, { relegated: true }))).toBe('relegated')
    expect(tierMove(team('a', 1, 0, 0))).toBeUndefined()
  })
})

describe('leaguesAddedAfter', () => {
  it('names Masters after 2021 and nothing after a year the league set stayed the same', () => {
    expect(leaguesAddedAfter('2021')).toEqual(['MASTERS'])
    expect(leaguesAddedAfter('2024')).toEqual([])
  })
})

describe('hasRelegation', () => {
  it('is every league but the bottom one of that year', () => {
    expect(hasRelegation('PREMIER', '2026')).toBe(true)
    expect(hasRelegation('MASTERS', '2026')).toBe(true)
    expect(hasRelegation('NATIONAL', '2026')).toBe(false)
  })
})

describe('seasonPlayoffPicture', () => {
  it('draws for a season part-way through', () => {
    const s = season([team('a', 1, 2, 0), team('b', 1, 1, 1), team('c', 2, 0, 2)], [game(1, 'a', 1, 'b', 0)])
    const picture = seasonPlayoffPicture(s, FORMAT)
    expect(picture?.order).toEqual(['a', 'c', 'b'])
    expect(picture && firstOutside(picture)).toBe('b')
  })

  it('stays out of an unplayed season and a finished one', () => {
    expect(seasonPlayoffPicture(season([team('a', 1, 0, 0)], []), FORMAT)).toBeUndefined()
    expect(seasonPlayoffPicture(premier2025 as unknown as SeasonData, FORMAT)).toBeUndefined()
  })
})

describe('livePlayoffPicture', () => {
  const data: LiveSeasonData = {
    tier: 'NATIONAL',
    year: '2026',
    leagueId: 'x',
    currentWeek: 2,
    memberIds: ['a', 'b', 'c', 'd'],
    // Week 2 is in progress: its partial score must not count.
    games: [game(1, 'a', 100, 'b', 90), game(1, 'c', 100, 'd', 90), game(2, 'b', 150, 'a', 0)],
  }
  const rows = standingsThroughPreviousWeek(data)
  const divisions = new Map([
    ['a', 1],
    ['b', 1],
    ['c', 2],
    ['d', 2],
  ])

  it('takes each division leader from completed weeks only', () => {
    const picture = livePlayoffPicture(data, rows, divisions, FORMAT)
    expect(picture?.berths).toEqual(new Map([['a', 'division'], ['c', 'division']]))
  })

  it('says nothing before a week has finished', () => {
    expect(livePlayoffPicture({ ...data, currentWeek: 1 }, rows, divisions, FORMAT)).toBeUndefined()
  })
})

describe('divisionsOf', () => {
  it('maps each team with a division', () => {
    expect(divisionsOf(season([team('a', 3, 0, 0)], []))).toEqual(new Map([['a', 3]]))
    expect(divisionsOf(undefined)).toEqual(new Map())
  })
})

describe('inPictureOrder', () => {
  it('re-orders and re-ranks rows to match the picture', () => {
    const rows = [
      { id: 'x', rank: 1 },
      { id: 'y', rank: 1 },
      { id: 'z', rank: 3 },
    ]
    const picture = { order: ['z', 'x', 'y'], berths: new Map() }
    expect(inPictureOrder(rows, picture, (r) => r.id)).toEqual([
      { id: 'z', rank: 1 },
      { id: 'x', rank: 2 },
      { id: 'y', rank: 3 },
    ])
  })
})

describe('baseRateFor', () => {
  const rates = (week: number): PlayoffBaseRates => ({ week, since: '2018', byRecord: new Map([['2-1', { made: 58, total: 83 }]]) })

  it('answers from week 3 on', () => {
    expect(baseRateFor(rates(3), { wins: 2, losses: 1, ties: 0 })).toEqual({ made: 58, total: 83 })
    expect(baseRateFor(rates(2), { wins: 2, losses: 1, ties: 0 })).toBeUndefined()
    expect(baseRateFor(rates(3), { wins: 3, losses: 0, ties: 0 })).toBeUndefined()
    expect(baseRateFor(undefined, { wins: 2, losses: 1, ties: 0 })).toBeUndefined()
  })
})
