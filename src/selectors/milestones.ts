import type { SeasonData, Tournament } from '@/data'
import { aroundTheUnionYear, latestUnionWeek } from './aroundTheUnion'
import { careerStats } from './career'
import { careerWinnings } from './prizes'
import { seasonsThroughWeek } from './throughWeek'

// Career milestones — the "Milestone Watch" page. Thresholds are the commissioner's; everything
// else here is derived from the same career totals the Stats page uses, so a member's milestone
// progress can never disagree with their career row. Nothing is stored.

export const MILESTONE_CATEGORIES = ['pointsFor', 'wins', 'earnings', 'pointsAgainst'] as const
export type MilestoneCategory = (typeof MILESTONE_CATEGORIES)[number]

/** Thresholds per category, ascending. */
export const MILESTONES: Record<MilestoneCategory, number[]> = {
  pointsFor: [10_000, 15_000, 20_000, 25_000],
  pointsAgainst: [10_000, 15_000, 20_000, 25_000],
  wins: [50, 100, 150],
  earnings: [500, 1_000, 1_500],
}

/**
 * How far through the current band counts as "on watch".
 *
 * Measured from the PREVIOUS milestone, not from zero. Measuring from zero makes the bands wildly
 * unfair to each other — a member on 11,300 points is 75% of the way to 15,000 from zero but has
 * only just cleared 10,000, and would sit on the watch list for years. Against the real data,
 * from-zero puts 18 of 61 members on the points watch; from the previous milestone it is 7, which
 * is what "about to happen" should mean.
 */
export const WATCH_THRESHOLD = 0.75

export interface MilestoneAchievement {
  milestone: number
  /** The season it was passed in. */
  year: string
}

export interface MilestoneStanding {
  memberId: string
  category: MilestoneCategory
  value: number
  /** Thresholds already passed, ascending. */
  achieved: MilestoneAchievement[]
  /** The next threshold, or null once every one is passed. */
  next: number | null
  /** Where the current band starts — the last threshold passed, or 0. */
  from: number
  /** 0–1 through the band from `from` to `next`; null when there is no next. */
  progress: number | null
  /** How much more is needed; null when there is no next. */
  remaining: number | null
}

const valueOf = (totals: CareerTotals, category: MilestoneCategory): number => totals[category]

interface CareerTotals {
  pointsFor: number
  pointsAgainst: number
  wins: number
  earnings: number
}

/** Career totals per member for the seasons given — the four numbers the milestones track. */
function totalsFor(seasons: SeasonData[], tournaments: Tournament[]): Map<string, CareerTotals> {
  const careers = careerStats(seasons)
  const winnings = careerWinnings(seasons, tournaments)
  const out = new Map<string, CareerTotals>()
  for (const [memberId, c] of careers) {
    out.set(memberId, {
      pointsFor: c.pointsFor,
      pointsAgainst: c.pointsAgainst,
      wins: c.wins,
      earnings: winnings.get(memberId)?.total ?? 0,
    })
  }
  return out
}

/**
 * The season each threshold was passed in, per member per category.
 *
 * Derived by re-running the career totals over each year's worth of seasons in turn and noting when
 * a total first clears a threshold. Recomputing rather than accumulating by hand is deliberate: the
 * totals then come from exactly the same selectors the rest of the site uses, so "hit 10,000 in
 * 2024" can never drift from the career figure shown beside it. Nine passes over a small dataset.
 */
function achievementsByYear(seasons: SeasonData[], tournaments: Tournament[]): Map<string, MilestoneAchievement[]> {
  const years = [...new Set(seasons.map((s) => s.year))].sort()
  const out = new Map<string, MilestoneAchievement[]>()
  const reached = new Map<string, Set<number>>() // `${memberId}|${category}` -> thresholds seen

  for (const year of years) {
    const upTo = seasons.filter((s) => Number(s.year) <= Number(year))
    for (const [memberId, totals] of totalsFor(upTo, tournaments)) {
      for (const category of MILESTONE_CATEGORIES) {
        const key = `${memberId}|${category}`
        const seen = reached.get(key) ?? new Set<number>()
        for (const milestone of MILESTONES[category]) {
          if (valueOf(totals, category) < milestone || seen.has(milestone)) continue
          seen.add(milestone)
          out.set(key, [...(out.get(key) ?? []), { milestone, year }])
        }
        reached.set(key, seen)
      }
    }
  }
  return out
}

/** Where `value` sits between milestones. */
export function bandFor(value: number, milestones: number[]): Pick<MilestoneStanding, 'next' | 'from' | 'progress' | 'remaining'> {
  const next = milestones.find((m) => value < m) ?? null
  const from = [...milestones].reverse().find((m) => m <= value) ?? 0
  if (next === null) return { next: null, from, progress: null, remaining: null }
  return { next, from, progress: (value - from) / (next - from), remaining: next - value }
}

/** Every member's standing in every category. */
export function milestoneStandings(seasons: SeasonData[], tournaments: Tournament[]): MilestoneStanding[] {
  const achievements = achievementsByYear(seasons, tournaments)
  const out: MilestoneStanding[] = []
  for (const [memberId, totals] of totalsFor(seasons, tournaments)) {
    for (const category of MILESTONE_CATEGORIES) {
      const value = valueOf(totals, category)
      out.push({
        memberId,
        category,
        value,
        achieved: achievements.get(`${memberId}|${category}`) ?? [],
        ...bandFor(value, MILESTONES[category]),
      })
    }
  }
  return out
}

/** Close enough to the next milestone to be on Milestone Watch. */
export function isOnWatch(standing: MilestoneStanding, cutoff: number = WATCH_THRESHOLD): boolean {
  return standing.progress !== null && standing.progress >= cutoff
}

/** One member's standing in every category, in MILESTONE_CATEGORIES order (Members page). */
export function memberMilestones(standings: MilestoneStanding[], memberId: string): MilestoneStanding[] {
  const mine = standings.filter((s) => s.memberId === memberId)
  return MILESTONE_CATEGORIES.flatMap((category) => mine.filter((s) => s.category === category))
}

/**
 * Members close enough to their next milestone to be worth watching, by category, closest first.
 * A member who has passed everything is not on watch — there is nothing left to approach.
 */
export function milestoneWatch(
  standings: MilestoneStanding[],
  cutoff: number = WATCH_THRESHOLD,
): Map<MilestoneCategory, MilestoneStanding[]> {
  const out = new Map<MilestoneCategory, MilestoneStanding[]>()
  for (const category of MILESTONE_CATEGORIES) {
    const rows = standings
      .filter((s) => s.category === category && isOnWatch(s, cutoff))
      .sort((a, b) => (a.remaining ?? 0) - (b.remaining ?? 0))
    out.set(category, rows)
  }
  return out
}

/** How many weeks a fallen milestone stays up: the week it fell and the one before it, so a
 *  newsletter that skipped a week, or writes up the week late, still has it to hand. */
export const RECENT_WEEKS = 2

export interface MilestoneReached {
  memberId: string
  category: MilestoneCategory
  milestone: number
  /** The week of the season it fell in. */
  week: number
  /** The career total now — at the end of the latest week asked about — which may be past it. */
  value: number
}

/** Thresholds a career total was below in `before` and at or above in `after`, largest first
 *  within each category. `now` supplies the total each one reports. */
function crossed(
  before: Map<string, CareerTotals>,
  after: Map<string, CareerTotals>,
  now: Map<string, CareerTotals>,
  week: number,
): MilestoneReached[] {
  const out: MilestoneReached[] = []
  for (const category of MILESTONE_CATEGORIES) {
    const reached: MilestoneReached[] = []
    for (const [memberId, totals] of after) {
      const was = before.get(memberId)?.[category] ?? 0
      const value = now.get(memberId)?.[category] ?? valueOf(totals, category)
      for (const milestone of MILESTONES[category]) {
        if (was < milestone && milestone <= valueOf(totals, category)) reached.push({ memberId, category, milestone, week, value })
      }
    }
    out.push(...reached.sort((a, b) => b.milestone - a.milestone || b.value - a.value))
  }
  return out
}

/**
 * Milestones passed in the RECENT_WEEKS weeks of `year` up to and including `week`, newest week
 * first: every threshold a career total was below when a week began and at or above when it ended.
 *
 * Without this a milestone simply vanishes the week it falls — the member moves on to watching the
 * next one — which is exactly when the newsletter wants to write about it. Callers ask about the
 * latest completed week, so a milestone stays up for that many weeks and then drops off. The window
 * never reaches back into the previous season: week 1 reports week 1 alone.
 */
export function milestonesReachedRecently(
  seasons: SeasonData[],
  tournaments: Tournament[],
  year: string,
  week: number,
): MilestoneReached[] {
  const first = Math.max(1, week - RECENT_WEEKS + 1)
  const through = new Map<number, Map<string, CareerTotals>>()
  for (let w = first - 1; w <= week; w++) through.set(w, totalsFor(seasonsThroughWeek(seasons, year, w), tournaments))
  const at = (w: number) => through.get(w) ?? new Map<string, CareerTotals>()
  const out: MilestoneReached[] = []
  for (let w = week; w >= first; w--) out.push(...crossed(at(w - 1), at(w), at(week), w))
  return out
}

/**
 * The week whose recent milestones are still news, for a view that isn't framed on a week of its
 * own: the latest week completed across the union, for as long as nothing has been played since.
 *
 * "Nothing played since" is what retires it. Week to week that is simply the next week landing,
 * but once the regular season is over the latest completed week stays week 14 for good — so the
 * first playoff games, not next August, are what take its milestones down.
 */
export function milestoneNewsWeek(seasons: SeasonData[]): { year: string; week: number } | undefined {
  const year = aroundTheUnionYear(seasons)
  if (year === undefined) return undefined
  const yearSeasons = seasons.filter((s) => s.year === year)
  const week = latestUnionWeek(yearSeasons)
  const lastPlayed = Math.max(0, ...yearSeasons.flatMap((s) => s.games.map((g) => g.week)))
  return week !== undefined && week === lastPlayed ? { year, week } : undefined
}
