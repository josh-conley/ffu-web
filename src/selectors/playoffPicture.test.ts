import type { PlayoffFormat } from '@/config'
import type { Game, SeasonData } from '@/data'
import { playoffPicture, type PictureEntrant } from './playoffPicture'
import { winPct } from './standings'

const H2H: PlayoffFormat = { teams: 6, tiebreak: 'head-to-head' }
const POINTS: PlayoffFormat = { teams: 6, tiebreak: 'points' }

const entrant = (memberId: string, divisionId: number, wins: number, games: number, pointsFor: number): PictureEntrant => ({
  memberId,
  divisionId,
  winPct: wins / games,
  pointsFor,
})
const game = (week: number, a: string, aScore: number, b: string, bScore: number): Game => ({
  week,
  isPlayoff: false,
  participants: [
    { memberId: a, score: aScore },
    { memberId: b, score: bScore },
  ],
})

describe('playoffPicture', () => {
  it('puts every division leader in, even one with a worse record than the wildcards', () => {
    const teams = [
      entrant('a', 1, 10, 14, 1500),
      entrant('b', 1, 9, 14, 1500),
      entrant('c', 1, 9, 14, 1400),
      entrant('d', 1, 9, 14, 1300),
      entrant('e', 2, 8, 14, 1500),
      entrant('f', 3, 5, 14, 1500),
      entrant('g', 3, 4, 14, 1500),
    ]
    const picture = playoffPicture(teams, [], H2H)
    expect(picture.berths.get('f')).toBe('division')
    expect(picture.berths.get('d')).toBe('wildcard')
    expect(picture.berths.has('g')).toBe(false)
    // Qualifiers first (in standings order), then the rest.
    expect(picture.order).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  })

  it('breaks a tied record on head-to-head before points, or on points alone', () => {
    const teams = [
      entrant('a', 1, 10, 14, 1800),
      entrant('b', 2, 10, 14, 1800),
      entrant('c', 3, 10, 14, 1800),
      entrant('w1', 1, 9, 14, 1800),
      entrant('w2', 2, 9, 14, 1800),
      entrant('rich', 3, 7, 14, 1700),
      entrant('beater', 3, 7, 14, 1500),
    ]
    const games = [game(1, 'beater', 100, 'rich', 90)]
    expect(playoffPicture(teams, games, H2H).berths.get('beater')).toBe('wildcard')
    expect(playoffPicture(teams, games, H2H).berths.has('rich')).toBe(false)
    expect(playoffPicture(teams, games, POINTS).berths.get('rich')).toBe('wildcard')
  })

  it('ignores playoff games', () => {
    const teams = [entrant('a', 1, 1, 2, 100), entrant('b', 1, 1, 2, 200)]
    const playoff = { ...game(15, 'a', 100, 'b', 50), isPlayoff: true }
    expect(playoffPicture(teams, [playoff], { teams: 1, tiebreak: 'head-to-head' }).order[0]).toBe('b')
  })
})

// The rule's evidence: fed each finished Sleeper season's final regular-season table, it must name
// exactly the six teams that actually played in that season's championship bracket. 2021 ran on
// Sleeper's points tiebreak (`playoff_seed_type` 0), every season since on head-to-head (1).
const files = import.meta.glob<SeasonData>('../../public/data/*/*.json', { eager: true, import: 'default' })
const sleeperSeasons = Object.entries(files)
  .filter(([path]) => /\/(premier|masters|national)\.json$/.test(path))
  .map(([, season]) => season)
  .filter((s) => s.era === 'sleeper' && s.teams.every((t) => t.finalPlacement !== undefined))

describe('playoffPicture against every finished Sleeper season', () => {
  it('has the seasons to check', () => {
    expect(sleeperSeasons.length).toBeGreaterThanOrEqual(14)
  })

  it.each(sleeperSeasons.map((s) => [`${s.year} ${s.tier}`, s] as const))('%s: names the real playoff field', (_, season) => {
    const format = Number(season.year) <= 2021 ? POINTS : H2H
    const entrants = season.teams.map((t) => ({ memberId: t.memberId, divisionId: t.divisionId, winPct: winPct(t.record), pointsFor: t.points.for }))
    const actual = new Set(season.games.filter((g) => g.bracket === 'championship').flatMap((g) => g.participants.map((p) => p.memberId)))
    const predicted = playoffPicture(entrants, season.games, format)
    expect(new Set(predicted.berths.keys())).toEqual(actual)
  })
})
