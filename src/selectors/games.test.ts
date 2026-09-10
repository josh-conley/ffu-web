import type { Game, SeasonData } from '@/data'
import { hasBeenPlayed, isTie, winnerOf, marginOf, scoreFor, regularSeasonTotals, runningRecords } from './games'

const game = (aId: string, aScore: number, bId: string, bScore: number, isPlayoff = false): Game => ({
  week: 1,
  isPlayoff,
  participants: [
    { memberId: aId, score: aScore },
    { memberId: bId, score: bScore },
  ],
})

describe('per-game derivations', () => {
  it('derives winner / tie / margin / score', () => {
    expect(winnerOf(game('a', 120, 'b', 100))).toBe('a')
    expect(winnerOf(game('a', 100, 'b', 120))).toBe('b')
    expect(winnerOf(game('a', 100, 'b', 100))).toBeNull()
    expect(isTie(game('a', 100, 'b', 100))).toBe(true)
    expect(marginOf(game('a', 120, 'b', 100))).toBe(20)
    expect(scoreFor(game('a', 120, 'b', 100), 'b')).toBe(100)
  })
})

// Load every migrated season (drafts + lineups excluded) for a cross-check.
const modules = import.meta.glob('../../public/data/*/*.json', { eager: true, import: 'default' })
// Match the season files by NAME rather than excluding the others: a denylist silently reclassifies
// every new sibling file (adp.json did exactly that) as a season, and the failure looks like a data
// bug rather than a glob bug.
const seasons: SeasonData[] = Object.entries(modules)
  .filter(([path]) => /\/(premier|masters|national)\.json$/.test(path))
  .map(([, mod]) => mod as SeasonData)

describe('regularSeasonTotals cross-checks the STORED regular-season records', () => {
  it('loaded all 20 backfilled seasons plus the season in progress', () => {
    expect(seasons).toHaveLength(23)
  })

  it('derived W-L-T matches stored team.record for every team (proves winner logic)', () => {
    // The season being played has a file from the day its leagues were created; before its first
    // week there is nothing to cross-check, and its 0-0 rows are not evidence of anything.
    for (const season of seasons.filter(hasBeenPlayed)) {
      const totals = regularSeasonTotals(season)
      for (const team of season.teams) {
        const t = totals.get(team.memberId)
        const where = `${season.year}/${season.tier} ${team.memberId}`
        expect(t, where).toBeDefined()
        if (!t) continue
        // W-L-T derives exactly from the games.
        expect({ w: t.wins, l: t.losses, ti: t.ties }, where).toEqual({
          w: team.record.wins,
          l: team.record.losses,
          ti: team.record.ties,
        })
        // points are Sleeper's stored aggregate and may differ from the per-game sum by a few
        // points (Sleeper's own inconsistency); just sanity-bound it to catch gross errors.
        expect(Math.abs(t.pointsFor - team.points.for), `${where} pf`).toBeLessThan(10)
        expect(Math.abs(t.pointsAgainst - team.points.against), `${where} pa`).toBeLessThan(10)
      }
    }
  })
})

describe('runningRecords', () => {
  const wk = (week: number, aId: string, aScore: number, bId: string, bScore: number, isPlayoff = false): Game => ({
    week,
    isPlayoff,
    participants: [{ memberId: aId, score: aScore }, { memberId: bId, score: bScore }],
  })

  it('accumulates each member’s regular-season record inclusive of the week, excluding playoffs', () => {
    const season = {
      games: [
        wk(1, 'a', 120, 'b', 100), // a 1-0
        wk(2, 'a', 90, 'b', 100), // a 1-1
        wk(3, 'a', 100, 'b', 100), // tie → a 1-1-1
        wk(15, 'a', 130, 'b', 90, true), // playoff — excluded
      ],
    } satisfies Pick<SeasonData, 'games'>
    const rr = runningRecords(season)
    expect(rr.get('a')!.get(1)).toEqual({ wins: 1, losses: 0, ties: 0 })
    expect(rr.get('a')!.get(2)).toEqual({ wins: 1, losses: 1, ties: 0 })
    expect(rr.get('a')!.get(3)).toEqual({ wins: 1, losses: 1, ties: 1 })
    expect(rr.get('b')!.get(3)).toEqual({ wins: 1, losses: 1, ties: 1 })
    expect(rr.get('a')!.get(15)).toBeUndefined() // playoff week not recorded
  })
})

describe('hasBeenPlayed', () => {
  const shell = (over: Partial<SeasonData> = {}): SeasonData => ({
    schemaVersion: 1, tier: 'PREMIER', year: '2026', era: 'sleeper', platformLeagueId: 'x',
    teams: [{ memberId: 'a', record: { wins: 0, losses: 0, ties: 0 }, points: { for: 0, against: 0 }, promoted: false, relegated: false }],
    games: [],
    ...over,
  })

  it('is false for a season whose leagues exist but whose games have not started', () => {
    expect(hasBeenPlayed(shell())).toBe(false)
  })

  it('is true once there are games', () => {
    const games = [{ week: 1, isPlayoff: false, participants: [{ memberId: 'a', score: 100 }, { memberId: 'b', score: 90 }] }]
    expect(hasBeenPlayed(shell({ games }))).toBe(true)
  })

  it('is true for a stored record with no per-game rows (the ESPN-era migration)', () => {
    const teams = [{ memberId: 'a', record: { wins: 7, losses: 7, ties: 0 }, points: { for: 1, against: 1 }, promoted: false, relegated: false }]
    expect(hasBeenPlayed(shell({ teams }))).toBe(true)
  })
})
