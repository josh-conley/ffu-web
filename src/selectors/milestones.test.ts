import type { SeasonData } from '@/data'
import { bandFor, milestoneNewsWeek, milestonesReachedRecently, milestoneStandings, milestoneWatch, MILESTONES, WATCH_THRESHOLD } from './milestones'

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

describe('milestonesReachedRecently', () => {
  // Years with no prize schedule, so earnings stay out of it. 'a' carries 9,900 points and 49 wins
  // into 2031, and scores 150 a week; 'b' carries 14,700 points and scores 100 a week, so it passes
  // 15,000 in week 3.
  const past = season('2030', [team('a', 49, 9_900), team('b', 5, 14_700)])
  const game = (week: number) => ({
    week, isPlayoff: false,
    participants: [{ memberId: 'a', score: 150 }, { memberId: 'b', score: 100 }],
  })
  const current: SeasonData = {
    schemaVersion: 1, tier: 'PREMIER', year: '2031', era: 'sleeper', platformLeagueId: 'x',
    teams: [
      { memberId: 'a', record: { wins: 4, losses: 0, ties: 0 }, points: { for: 600, against: 400 }, promoted: false, relegated: false },
      { memberId: 'b', record: { wins: 0, losses: 4, ties: 0 }, points: { for: 400, against: 600 }, promoted: false, relegated: false },
    ],
    games: [game(1), game(2), game(3), game(4)],
  }
  const seasons = [past, current]

  it('reports each threshold crossed in week 1 alone, never reaching back a season', () => {
    expect(milestonesReachedRecently(seasons, '2031', 1)).toEqual([
      { memberId: 'a', category: 'pointsFor', milestone: 10_000, week: 1, value: 10_050 },
      { memberId: 'a', category: 'wins', milestone: 50, week: 1, value: 50 },
      // Landing exactly on a milestone counts as reaching it (9,900 against + 100).
      { memberId: 'a', category: 'pointsAgainst', milestone: 10_000, week: 1, value: 10_000 },
    ])
  })

  it('keeps a milestone up for the week after, newest week first, with the total as it stands now', () => {
    const recent = milestonesReachedRecently(seasons, '2031', 3)
    expect(recent.map((r) => [r.week, r.memberId, r.category, r.milestone])).toEqual([
      [3, 'b', 'pointsFor', 15_000],
      [2, 'b', 'pointsAgainst', 15_000], // 14,700 against + 150 a week
    ])
    expect(recent[1]!.value).toBe(15_150) // as of week 3, not the 15,000 it ended week 2 on
  })

  it('drops a milestone once it is more than the window old', () => {
    expect(milestonesReachedRecently(seasons, '2031', 4).map((r) => r.week)).toEqual([3])
  })
})

describe('milestoneNewsWeek', () => {
  const withGames = (weeks: [number, boolean][]): SeasonData => ({
    schemaVersion: 1, tier: 'PREMIER', year: '2031', era: 'sleeper', platformLeagueId: 'x', teams: [],
    games: weeks.map(([week, isPlayoff]) => ({
      week, isPlayoff, participants: [{ memberId: 'a', score: 1 }, { memberId: 'b', score: 0 }],
    })),
  })

  it('is the latest completed week while nothing has been played since', () => {
    expect(milestoneNewsWeek([withGames([[1, false], [2, false]])])).toEqual({ year: '2031', week: 2 })
  })

  it('retires the last regular-season week once the playoffs start', () => {
    expect(milestoneNewsWeek([withGames([[14, false], [15, true]])])).toBeUndefined()
  })
})
