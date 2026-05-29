import type { SeasonData } from '@/data'
import type { Tier } from '@/config/types'
import { winPct } from './standings'

// Career aggregates per member across seasons (Members career view + All-Time Stats). Sums the
// STORED Sleeper record/points (consistent with season display) and counts placements. The
// regular-season seed is never involved here.

export interface SeasonFinish {
  year: string
  tier: Tier
  finalPlacement: number | null
}

export interface CareerStats {
  memberId: string
  seasons: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  winPct: number
  championships: number // finalPlacement === 1
  runnerUps: number // finalPlacement === 2
  playoffAppearances: number // reached the championship bracket
  bestFinish: number | null
  /** First / most-recent season the member played (their true FFU debut + latest year). */
  firstYear: number | null
  lastYear: number | null
  finishes: SeasonFinish[]
}

/** Set of "year|tier" each member reached the championship bracket (vs consolation). */
function championshipBracketSeasons(seasons: SeasonData[]): Map<string, Set<string>> {
  const byMember = new Map<string, Set<string>>()
  for (const season of seasons) {
    for (const game of season.games) {
      if (game.bracket !== 'championship') continue
      for (const p of game.participants) {
        let set = byMember.get(p.memberId)
        if (set === undefined) {
          set = new Set()
          byMember.set(p.memberId, set)
        }
        set.add(`${season.year}|${season.tier}`)
      }
    }
  }
  return byMember
}

function emptyCareer(memberId: string): CareerStats {
  return {
    memberId,
    seasons: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    winPct: 0,
    championships: 0,
    runnerUps: 0,
    playoffAppearances: 0,
    bestFinish: null,
    firstYear: null,
    lastYear: null,
    finishes: [],
  }
}

export function careerStats(seasons: SeasonData[]): Map<string, CareerStats> {
  const playoffSeasons = championshipBracketSeasons(seasons)
  const career = new Map<string, CareerStats>()

  for (const season of seasons) {
    for (const t of season.teams) {
      let c = career.get(t.memberId)
      if (c === undefined) {
        c = emptyCareer(t.memberId)
        career.set(t.memberId, c)
      }
      c.seasons += 1
      c.wins += t.record.wins
      c.losses += t.record.losses
      c.ties += t.record.ties
      c.pointsFor += t.points.for
      c.pointsAgainst += t.points.against
      if (t.finalPlacement === 1) c.championships += 1
      if (t.finalPlacement === 2) c.runnerUps += 1
      c.finishes.push({ year: season.year, tier: season.tier, finalPlacement: t.finalPlacement ?? null })
    }
  }

  for (const [memberId, c] of career) {
    finalizeCareer(c, playoffSeasons.get(memberId)?.size ?? 0)
  }

  return career
}

/** Fill the derived fields once a member's per-season totals are accumulated. */
function finalizeCareer(c: CareerStats, playoffCount: number): void {
  c.winPct = winPct({ wins: c.wins, losses: c.losses, ties: c.ties })
  c.playoffAppearances = playoffCount
  const placements = c.finishes.map((f) => f.finalPlacement).filter((n): n is number => n !== null)
  c.bestFinish = placements.length > 0 ? Math.min(...placements) : null
  const yearsPlayed = c.finishes.map((f) => Number(f.year))
  c.firstYear = yearsPlayed.length > 0 ? Math.min(...yearsPlayed) : null
  c.lastYear = yearsPlayed.length > 0 ? Math.max(...yearsPlayed) : null
}

export function careerFor(seasons: SeasonData[], memberId: string): CareerStats | undefined {
  return careerStats(seasons).get(memberId)
}
