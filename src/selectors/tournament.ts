import type { Tier } from '@/config/types'
import type { SeasonData, Tournament, TournamentMatchup } from '@/data'
import { scoreFor } from './games'

// Resolves a cross-tier knockout tournament into a displayable bracket. Pure: the tournament file
// carries only FACTS (participants + the opening pairings); everything below — each team's weekly
// score, every winner, and the pairings of later rounds — is DERIVED from the three tiers' season
// data for the round's week (Charter: "store facts, derive opinions").

export type SeasonsByTier = Partial<Record<Tier, SeasonData>>

export interface ResolvedSide {
  ffuId: string
  tier: Tier
  /** Score in this team's tier game for the round week; undefined when that week has no data yet. */
  score?: number
}

export interface ResolvedMatchup {
  a: ResolvedSide
  b: ResolvedSide
  /** Winning ffuId. Undefined while undecided (missing score) or on a tie. */
  winner?: string
  tie: boolean
}

export interface ResolvedRound {
  key: string
  label: string
  week: number
  matchups: ResolvedMatchup[]
  /** Teams eliminated by the lowest-winner drop just before this round (usually 0 or 1). */
  dropped: ResolvedSide[]
}

export interface ResolvedTournament {
  name: string
  year: string
  rounds: ResolvedRound[]
  /** Set once the final is decided. */
  champion?: string
}

/** A winner carried into the next round, tagged with the score that won them their last game. */
interface Advancer {
  ffuId: string
  score: number
}

/** This team's score in its tier game for `week` (undefined if no such game / no data yet). */
export function weekScore(seasonsByTier: SeasonsByTier, tier: Tier, ffuId: string, week: number): number | undefined {
  const season = seasonsByTier[tier]
  if (season === undefined) return undefined
  for (const game of season.games) {
    if (game.week !== week) continue
    const score = scoreFor(game, ffuId)
    if (score !== undefined) return score
  }
  return undefined
}

/**
 * Default pairing for an unauthored round: bracket-tree adjacency (winner i vs winner i+1). Isolated
 * here because the real post-drop seeding rule is still TBD — swap this one function when it lands.
 */
function pairAdjacent(ffuIds: string[]): TournamentMatchup[] {
  const pairs: TournamentMatchup[] = []
  for (let i = 0; i + 1 < ffuIds.length; i += 2) {
    const a = ffuIds[i]
    const b = ffuIds[i + 1]
    if (a !== undefined && b !== undefined) pairs.push({ a, b })
  }
  return pairs
}

function resolveSide(tierOf: Map<string, Tier>, seasons: SeasonsByTier, ffuId: string, week: number): ResolvedSide {
  const tier = tierOf.get(ffuId) ?? 'NATIONAL'
  return { ffuId, tier, score: weekScore(seasons, tier, ffuId, week) }
}

function resolveMatchup(tierOf: Map<string, Tier>, seasons: SeasonsByTier, m: TournamentMatchup, week: number): ResolvedMatchup {
  const a = resolveSide(tierOf, seasons, m.a, week)
  const b = resolveSide(tierOf, seasons, m.b, week)
  if (a.score === undefined || b.score === undefined) return { a, b, tie: false }
  if (a.score === b.score) return { a, b, tie: true }
  return { a, b, tie: false, winner: a.score > b.score ? a.ffuId : b.ffuId }
}

/** Decided winners of a round, each tagged with their winning score (for the lowest-winner drop). */
function advancersOf(matchups: ResolvedMatchup[]): Advancer[] {
  const out: Advancer[] = []
  for (const m of matchups) {
    if (m.winner === undefined) continue
    const side = m.a.ffuId === m.winner ? m.a : m.b
    out.push({ ffuId: m.winner, score: side.score ?? 0 })
  }
  return out
}

/** Pool advancing into the next round, plus any team dropped as the lowest-scoring winner. */
function applyDrop(advancers: Advancer[], drop: boolean): { pool: Advancer[]; droppedId?: string } {
  if (!drop || advancers.length === 0) return { pool: advancers }
  const lowest = advancers.reduce((min, a) => (a.score < min.score ? a : min))
  return { pool: advancers.filter((a) => a !== lowest), droppedId: lowest.ffuId }
}

export function resolveTournament(t: Tournament, seasonsByTier: SeasonsByTier): ResolvedTournament {
  const tierOf = new Map(t.participants.map((p) => [p.ffuId, p.tier]))
  const rounds: ResolvedRound[] = []
  let advancers: Advancer[] = []

  for (const round of t.rounds) {
    const { pool, droppedId } = applyDrop(advancers, round.dropLowestWinner === true)
    // Authored pairings override the computed ones (e.g. a bespoke post-drop seed).
    const pairs = round.matchups ?? pairAdjacent(pool.map((a) => a.ffuId))
    const matchups = pairs.map((m) => resolveMatchup(tierOf, seasonsByTier, m, round.week))
    const dropped = droppedId === undefined ? [] : [resolveSide(tierOf, seasonsByTier, droppedId, round.week)]
    rounds.push({ key: round.key, label: round.label, week: round.week, matchups, dropped })
    advancers = advancersOf(matchups)
  }

  const final = rounds[rounds.length - 1]
  const champion = final?.matchups.length === 1 ? final.matchups[0]?.winner : undefined
  return { name: t.name, year: t.year, rounds, champion }
}
