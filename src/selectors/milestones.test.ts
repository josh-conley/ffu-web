import type { SeasonData } from '@/data'
import { bandFor, milestoneStandings, milestoneWatch, MILESTONES, WATCH_THRESHOLD } from './milestones'

describe('bandFor', () => {
  const points = MILESTONES.pointsFor // 10k / 15k / 20k / 25k

  it('measures the first band from zero', () => {
    expect(bandFor(7_500, points)).toEqual({ next: 10_000, from: 0, progress: 0.75, remaining: 2_500 })
  })

  it('measures later bands from the milestone just passed, not from zero', () => {
    // 11,300 is 75% of the way to 15,000 from zero, but has only just cleared 10,000. Counting it
    // as "on watch" for years is exactly what measuring from the previous milestone prevents.
    const band = bandFor(11_300, points)
    expect(band.from).toBe(10_000)
    expect(band.next).toBe(15_000)
    expect(band.progress).toBeCloseTo(0.26)
  })

  it('has no next once every milestone is passed', () => {
    expect(bandFor(26_000, points)).toEqual({ next: null, from: 25_000, progress: null, remaining: null })
  })

  it('treats landing exactly on a milestone as the start of the next band', () => {
    expect(bandFor(10_000, points)).toEqual({ next: 15_000, from: 10_000, progress: 0, remaining: 5_000 })
  })
})

// Two seasons so a threshold can be crossed in a known year.
const team = (memberId: string, wins: number, pf: number) => ({
  memberId, record: { wins, losses: 14 - wins, ties: 0 }, points: { for: pf, against: pf },
  finalPlacement: 1, promoted: false, relegated: false,
})
const season = (year: string, teams: ReturnType<typeof team>[]): SeasonData => ({
  schemaVersion: 1, tier: 'PREMIER', year, era: 'sleeper', platformLeagueId: 'x', teams,
  games: [{ week: 1, isPlayoff: false, participants: [{ memberId: teams[0]!.memberId, score: 1 }, { memberId: 'filler', score: 0 }] }],
})

describe('milestoneStandings', () => {
  const seasons = [
    season('2024', [team('a', 30, 6_000), team('b', 5, 1_000)]),
    season('2025', [team('a', 25, 5_000), team('b', 5, 1_000)]),
  ]
  const forMember = (id: string, category: string) =>
    milestoneStandings(seasons).find((s) => s.memberId === id && s.category === category)!

  it('sums career totals and finds the next milestone', () => {
    const pf = forMember('a', 'pointsFor')
    expect(pf.value).toBe(11_000)
    expect(pf.next).toBe(15_000)
    expect(pf.from).toBe(10_000)
  })

  it('records the season a threshold was passed in', () => {
    // 'a' reaches 6,000 in 2024 and 11,000 in 2025, so 10,000 was crossed in 2025.
    expect(forMember('a', 'pointsFor').achieved).toEqual([{ milestone: 10_000, year: '2025' }])
    // 55 wins total, over 50 — also in 2025, since 2024 alone was 30.
    expect(forMember('a', 'wins').achieved).toEqual([{ milestone: 50, year: '2025' }])
  })

  it('reports nothing achieved for a member who has passed nothing', () => {
    expect(forMember('b', 'pointsFor').achieved).toEqual([])
    expect(forMember('b', 'pointsFor').value).toBe(2_000)
  })
})

describe('milestoneWatch', () => {
  const standing = (memberId: string, value: number) => ({
    memberId, category: 'wins' as const, value, achieved: [], ...bandFor(value, MILESTONES.wins),
  })

  it('lists only members at or past the cutoff, closest first', () => {
    const rows = milestoneWatch([standing('far', 20), standing('close', 48), standing('near', 40)]).get('wins')!
    expect(rows.map((r) => r.memberId)).toEqual(['close', 'near']) // 20/50 is 40%, below the cutoff
  })

  it('excludes a member with nothing left to reach', () => {
    expect(milestoneWatch([standing('done', 200)]).get('wins')).toEqual([])
  })

  it('takes the cutoff as an argument so the page can be tuned without touching the rule', () => {
    expect(milestoneWatch([standing('far', 20)], 0.3).get('wins')!.map((r) => r.memberId)).toEqual(['far'])
    expect(WATCH_THRESHOLD).toBe(0.75)
  })
})
