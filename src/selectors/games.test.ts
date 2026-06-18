import type { Game, SeasonData } from '@/data'
import { isTie, winnerOf, marginOf, scoreFor, regularSeasonTotals } from './games'

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
const seasons: SeasonData[] = Object.entries(modules)
  .filter(([path]) => !path.includes('.draft.') && !path.includes('.lineups.') && !path.includes('tournament'))
  .map(([, mod]) => mod as SeasonData)

describe('regularSeasonTotals cross-checks the STORED regular-season records', () => {
  it('loaded all 20 seasons', () => {
    expect(seasons).toHaveLength(20)
  })

  it('derived W-L-T matches stored team.record for every team (proves winner logic)', () => {
    for (const season of seasons) {
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
