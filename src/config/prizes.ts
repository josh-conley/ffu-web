import type { Tier } from './types'

// Prize SCHEDULES — the league's published payout amounts per season. Source of record is the
// per-year free-text public/data/{year}/prizes.txt the commissioner posts; these are the curated,
// type-checked transcriptions. They are RULES (config), not match data: the amounts live here and
// selectors/prizes.ts derives WHO won each category from season results and multiplies through.
// Hand-curated rather than parsed from the source (smart quotes, "$40" vs ": $40", per-year drift)
// — small, one-time, reliable. When a new season's prizes.txt lands, transcribe a new entry here.
//
// Conventions captured from the source text:
//  - `divisionChamp` is paid to EACH division's regular-season winner (best record in the division).
//  - `weeklyHighScore` is paid EACH regular-season week to that week's top scorer (confirmed: per
//    week, not once). National never carries a per-tier weekly-high prize.
//  - `crossUnion` categories pay the single union-wide winner across all tiers (2023+).
//  - `crossLeague.mostLeaguewidePoints` pays each team in the tier with the most combined
//    regular-season points (2024+).

/** Per-tier prizes. Every field optional — only categories the season actually offered are present. */
export interface TierPrizeSchedule {
  champion?: number
  runnerUp?: number
  third?: number
  /** Paid to each division's regular-season winner. */
  divisionChamp?: number
  mostPoints?: number
  /** Paid each regular-season week to that week's high scorer. */
  weeklyHighScore?: number
  highestFloor?: number
  highestScoreInLoss?: number
}

/** Union-wide prizes (independent of league): the single best across all tiers. */
export interface CrossUnionSchedule {
  weeklyHighScore?: number
  mostPoints?: number
  highestFloor?: number
  highestScoreInLoss?: number
}

/** League-vs-league prize: each team in the top-scoring tier is paid. */
export interface CrossLeagueSchedule {
  mostLeaguewidePoints?: number
}

export interface SeasonPrizeSchedule {
  tiers: Partial<Record<Tier, TierPrizeSchedule>>
  crossUnion?: CrossUnionSchedule
  crossLeague?: CrossLeagueSchedule
}

export const PRIZE_SCHEDULES: Record<string, SeasonPrizeSchedule> = {
  '2021': {
    tiers: {
      PREMIER: { champion: 440, runnerUp: 190, third: 75, divisionChamp: 40, mostPoints: 45, weeklyHighScore: 10 },
      NATIONAL: { champion: 200, runnerUp: 90, third: 50, divisionChamp: 20, mostPoints: 30 },
    },
  },
  '2022': {
    tiers: {
      PREMIER: { champion: 500, runnerUp: 200, third: 90, divisionChamp: 40, mostPoints: 50, weeklyHighScore: 10 },
      MASTERS: { champion: 300, runnerUp: 125, third: 70, divisionChamp: 20, mostPoints: 30, weeklyHighScore: 5 },
      NATIONAL: { champion: 200, runnerUp: 90, third: 50, divisionChamp: 20, mostPoints: 20 },
    },
  },
  '2023': {
    tiers: {
      PREMIER: { champion: 500, runnerUp: 200, third: 90, divisionChamp: 40, mostPoints: 50, weeklyHighScore: 10 },
      MASTERS: { champion: 300, runnerUp: 125, third: 70, divisionChamp: 20, mostPoints: 30, weeklyHighScore: 5 },
      NATIONAL: { champion: 200, runnerUp: 90, third: 50, divisionChamp: 20, mostPoints: 20 },
    },
    crossUnion: { weeklyHighScore: 10, mostPoints: 40 },
  },
  '2024': {
    tiers: {
      PREMIER: { champion: 500, runnerUp: 200, third: 90, divisionChamp: 40, mostPoints: 70, weeklyHighScore: 10 },
      MASTERS: { champion: 300, runnerUp: 125, third: 70, divisionChamp: 20, mostPoints: 50, weeklyHighScore: 5 },
      NATIONAL: { champion: 200, runnerUp: 90, third: 50, divisionChamp: 20, mostPoints: 40 },
    },
    crossUnion: { weeklyHighScore: 10, mostPoints: 40 },
    crossLeague: { mostLeaguewidePoints: 10 },
  },
  '2025': {
    tiers: {
      PREMIER: { champion: 500, runnerUp: 200, third: 90, divisionChamp: 40, mostPoints: 70, highestFloor: 20, highestScoreInLoss: 20, weeklyHighScore: 10 },
      MASTERS: { champion: 300, runnerUp: 125, third: 70, divisionChamp: 20, mostPoints: 50, highestFloor: 20, highestScoreInLoss: 20, weeklyHighScore: 5 },
      NATIONAL: { champion: 200, runnerUp: 90, third: 50, divisionChamp: 20, mostPoints: 40, highestFloor: 20, highestScoreInLoss: 20 },
    },
    crossUnion: { weeklyHighScore: 10, mostPoints: 40, highestFloor: 30, highestScoreInLoss: 30 },
    crossLeague: { mostLeaguewidePoints: 10 },
  },
}

export function getPrizeSchedule(year: string): SeasonPrizeSchedule | undefined {
  return PRIZE_SCHEDULES[year]
}
