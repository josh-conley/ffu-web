import type { Tier } from '@/config'
import { getPrizeSchedule, type CrossLeagueSchedule, type CrossUnionSchedule, type TierPrizeSchedule } from '@/config'
import type { SeasonData } from '@/data'
import { regularSeasonTotals, winnerOf } from './games'
import { divisionWinnerIds } from './standings'

// Career prize winnings — DERIVED, never stored. The published payout amounts live in config
// (config/prizes.ts); here we work out WHO won each category from the season's results and multiply
// through. Cross-union/cross-league prizes compare across every tier in a year, so this operates on
// the full season set (grouped by year), not one tier in isolation.
//
// Tie handling: when teams tie for a category (same high score, same floor, …) every tied team is
// paid the full amount — mirroring how shared division pennants are credited. Rare; small effect.

/** Total winnings for one member, plus a per-tier split so the Stats page can scope by league. */
export interface Winnings {
  total: number
  byTier: Partial<Record<Tier, number>>
}

interface Award {
  memberIds: string[]
  value: number
}

interface TierMetrics {
  tier: Tier
  champion?: string
  runnerUp?: string
  third?: string
  divisionWinners: string[]
  mostPoints: Award
  highestFloor: Award
  highestScoreInLoss: Award
  weekly: Award[]
  pointsSum: number
  memberIds: string[]
}

/** Argmax over entries, keeping every tied member. Empty entries → no winners. */
function maxAward(entries: { memberId: string; value: number }[]): Award {
  let value = -Infinity
  const memberIds: string[] = []
  for (const e of entries) {
    if (e.value > value) {
      value = e.value
      memberIds.length = 0
      memberIds.push(e.memberId)
    } else if (e.value === value) {
      memberIds.push(e.memberId)
    }
  }
  return { memberIds, value }
}

/** Per regular-season week, the high scorer(s) across the tier. */
function weeklyHighs(season: SeasonData): Award[] {
  const byWeek = new Map<number, { memberId: string; value: number }[]>()
  for (const g of season.games) {
    if (g.isPlayoff) continue
    const arr = byWeek.get(g.week) ?? []
    for (const p of g.participants) arr.push({ memberId: p.memberId, value: p.score })
    byWeek.set(g.week, arr)
  }
  return [...byWeek.values()].map(maxAward)
}

/** Highest score by a team that still LOST, over the regular season. */
function scoreInLossAward(season: SeasonData): Award {
  const entries: { memberId: string; value: number }[] = []
  for (const g of season.games) {
    if (g.isPlayoff) continue
    const w = winnerOf(g)
    if (w === null) continue
    const loser = g.participants.find((p) => p.memberId !== w)
    if (loser) entries.push({ memberId: loser.memberId, value: loser.score })
  }
  return maxAward(entries)
}

function placement(season: SeasonData, rank: number): string | undefined {
  return season.teams.find((t) => t.finalPlacement === rank)?.memberId
}

function tierMetrics(season: SeasonData): TierMetrics {
  const totals = [...regularSeasonTotals(season).values()]
  return {
    tier: season.tier,
    champion: placement(season, 1),
    runnerUp: placement(season, 2),
    third: placement(season, 3),
    divisionWinners: [...divisionWinnerIds(season)],
    mostPoints: maxAward(totals.map((t) => ({ memberId: t.memberId, value: t.pointsFor }))),
    highestFloor: maxAward(totals.map((t) => ({ memberId: t.memberId, value: t.low }))),
    highestScoreInLoss: scoreInLossAward(season),
    weekly: weeklyHighs(season),
    pointsSum: totals.reduce((sum, t) => sum + t.pointsFor, 0),
    memberIds: totals.map((t) => t.memberId),
  }
}

function add(result: Map<string, Winnings>, memberId: string, tier: Tier, amount: number): void {
  const w = result.get(memberId) ?? { total: 0, byTier: {} }
  w.total += amount
  w.byTier[tier] = (w.byTier[tier] ?? 0) + amount
  result.set(memberId, w)
}

/** Award `amount` (if offered) to every member in `memberIds`, attributed to `tier`. */
function award(result: Map<string, Winnings>, memberIds: string[], tier: Tier, amount?: number): void {
  if (!amount) return
  for (const id of memberIds) add(result, id, tier, amount)
}

function applyTierPrizes(result: Map<string, Winnings>, m: TierMetrics, sched: TierPrizeSchedule): void {
  award(result, m.champion ? [m.champion] : [], m.tier, sched.champion)
  award(result, m.runnerUp ? [m.runnerUp] : [], m.tier, sched.runnerUp)
  award(result, m.third ? [m.third] : [], m.tier, sched.third)
  award(result, m.divisionWinners, m.tier, sched.divisionChamp)
  award(result, m.mostPoints.memberIds, m.tier, sched.mostPoints)
  award(result, m.highestFloor.memberIds, m.tier, sched.highestFloor)
  award(result, m.highestScoreInLoss.memberIds, m.tier, sched.highestScoreInLoss)
  if (sched.weeklyHighScore) for (const wk of m.weekly) award(result, wk.memberIds, m.tier, sched.weeklyHighScore)
}

/** Union-wide winners of a single-value category: the members holding the global max across tiers. */
function crossWinners(awards: Award[]): string[] {
  const max = Math.max(...awards.map((a) => a.value))
  return awards.filter((a) => a.value === max).flatMap((a) => a.memberIds)
}

function tierOfMember(metrics: TierMetrics[]): Map<string, Tier> {
  const map = new Map<string, Tier>()
  for (const m of metrics) for (const id of m.memberIds) map.set(id, m.tier)
  return map
}

function applyCrossUnion(result: Map<string, Winnings>, metrics: TierMetrics[], sched: CrossUnionSchedule): void {
  const tierOf = tierOfMember(metrics)
  const pay = (ids: string[], amount?: number) => {
    if (!amount) return
    for (const id of ids) add(result, id, tierOf.get(id) as Tier, amount)
  }
  pay(crossWinners(metrics.map((m) => m.mostPoints)), sched.mostPoints)
  pay(crossWinners(metrics.map((m) => m.highestFloor)), sched.highestFloor)
  pay(crossWinners(metrics.map((m) => m.highestScoreInLoss)), sched.highestScoreInLoss)
  if (sched.weeklyHighScore) {
    const weeks = Math.max(...metrics.map((m) => m.weekly.length))
    for (let i = 0; i < weeks; i++) {
      pay(crossWinners(metrics.map((m) => m.weekly[i]).filter((a): a is Award => a !== undefined)), sched.weeklyHighScore)
    }
  }
}

function applyCrossLeague(result: Map<string, Winnings>, metrics: TierMetrics[], sched: CrossLeagueSchedule): void {
  if (!sched.mostLeaguewidePoints || metrics.length === 0) return
  const top = metrics.reduce((a, b) => (b.pointsSum > a.pointsSum ? b : a))
  award(result, top.memberIds, top.tier, sched.mostLeaguewidePoints)
}

/** Career winnings per member across all seasons (years without a published schedule are skipped). */
export function careerWinnings(seasons: SeasonData[]): Map<string, Winnings> {
  const result = new Map<string, Winnings>()
  const byYear = new Map<string, SeasonData[]>()
  for (const s of seasons) {
    const a = byYear.get(s.year) ?? []
    a.push(s)
    byYear.set(s.year, a)
  }
  for (const [year, yearSeasons] of byYear) {
    const sched = getPrizeSchedule(year)
    if (!sched) continue
    const metrics = yearSeasons.map(tierMetrics)
    for (const m of metrics) {
      const ts = sched.tiers[m.tier]
      if (ts) applyTierPrizes(result, m, ts)
    }
    if (sched.crossUnion) applyCrossUnion(result, metrics, sched.crossUnion)
    if (sched.crossLeague) applyCrossLeague(result, metrics, sched.crossLeague)
  }
  return result
}
