import type { Tier } from '@/config/types'
import type { SeasonData, Tournament } from '@/data'
import { resolveCupFrom, type ResolvedMatchup, type ResolvedSide, type ResolvedTournament } from './tournament'

// The FFU Cup as history: every Cup game played, and each team's run through each Cup. Read off the
// same resolved bracket the Cup page and the prize money use, so a Cup result can never disagree
// between pages.
//
// A Cup score IS the team's league score that week, so nothing here feeds league totals: a Cup win
// is not a league win, and its points are already in Points For. The Cup only adds meetings (to the
// head-to-head series), hardware and runs.

type PlayedSide = ResolvedSide & { score: number }

/** One Cup game with both scores in. */
export interface CupGame {
  year: string
  /** The round's label, e.g. "Round of 18". */
  round: string
  week: number
  a: PlayedSide
  b: PlayedSide
}

/** One team's run through one Cup. */
export interface CupRun {
  memberId: string
  year: string
  /** Their league that season: a league-scoped view counts the runs made from that league. */
  tier: Tier
  /** The furthest round they were drawn into, and how deep it is (0 = the opening round). */
  round: string
  depth: number
  wins: number
  losses: number
  ties: number
  champion: boolean
  /** Lost the final. */
  runnerUp: boolean
  /**
   * Knocked out: lost, or dropped as the Round of 18's lowest-scoring winner (who still won the
   * game, so it counts as a win). False while still in it.
   */
  out: boolean
}

export interface CupCareer {
  memberId: string
  /** Oldest first. */
  runs: CupRun[]
  /** Years they won the Cup. */
  titles: string[]
  /** Their deepest run (the latest, when two went equally far). */
  best: CupRun
  wins: number
  losses: number
  ties: number
}

/** Cups that have been drawn and whose year is among `seasons`: those are the only ones with results. */
function resolvedCups(seasons: readonly SeasonData[], tournaments: readonly Tournament[]): ResolvedTournament[] {
  const years = new Set(seasons.map((s) => s.year))
  return tournaments.filter((t) => t.participants.length > 0 && years.has(t.year)).map((t) => resolveCupFrom(t, seasons))
}

/** Every Cup game with both scores in, across every Cup given. */
export function cupGames(seasons: readonly SeasonData[], tournaments: readonly Tournament[]): CupGame[] {
  return resolvedCups(seasons, tournaments).flatMap((cup) =>
    cup.rounds.flatMap((round) =>
      round.matchups.flatMap(({ a, b }) =>
        a.score === undefined || b.score === undefined
          ? []
          : [{ year: cup.year, round: round.label, week: round.week, a: { ...a, score: a.score }, b: { ...b, score: b.score } }],
      ),
    ),
  )
}

const newRun = (side: ResolvedSide, year: string): CupRun => ({
  memberId: side.ffuId,
  year,
  tier: side.tier,
  round: '',
  depth: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  champion: false,
  runnerUp: false,
  out: false,
})

/** Score one side of one game into its run. */
function scoreSide(run: CupRun, m: ResolvedMatchup, droppedHere: boolean, isFinal: boolean): void {
  if (m.winner === run.memberId) {
    run.wins += 1
    if (droppedHere) run.out = true
  } else if (m.winner !== undefined) {
    run.losses += 1
    run.out = true
    run.runnerUp = isFinal
  } else if (m.tie) {
    run.ties += 1
  }
}

function runsOf(cup: ResolvedTournament): CupRun[] {
  const byMember = new Map<string, CupRun>()
  const lastDepth = cup.rounds.length - 1
  cup.rounds.forEach((round, depth) => {
    const dropped = new Set(round.dropped.map((d) => d.ffuId))
    for (const m of round.matchups) {
      for (const side of [m.a, m.b]) {
        const run = byMember.get(side.ffuId) ?? newRun(side, cup.year)
        run.round = round.label
        run.depth = depth
        scoreSide(run, m, dropped.has(side.ffuId), depth === lastDepth)
        byMember.set(side.ffuId, run)
      }
    }
  })
  const champion = cup.champion === undefined ? undefined : byMember.get(cup.champion)
  if (champion) champion.champion = true
  return [...byMember.values()]
}

/** Every team's run through every Cup given (Cups not yet drawn have none). */
export function cupRuns(seasons: readonly SeasonData[], tournaments: readonly Tournament[]): CupRun[] {
  return resolvedCups(seasons, tournaments).flatMap(runsOf)
}

/** How far a run went, as one sortable number: deeper is higher, and winning the final tops losing it. */
export const cupRunRank = (run: CupRun): number => run.depth * 2 + (run.champion ? 1 : 0)

/** A run's finish in words: "Champion", "Runner-up", or the round they went out in (or are in now). */
export function cupFinish(run: CupRun): string {
  if (run.champion) return 'Champion'
  if (run.runnerUp) return 'Runner-up'
  return run.round
}

/** Each member's Cup career, from the runs given (filter them first to scope by league or year). */
export function cupCareers(runs: readonly CupRun[]): Map<string, CupCareer> {
  const out = new Map<string, CupCareer>()
  const oldestFirst = [...runs].sort((x, y) => x.year.localeCompare(y.year))
  for (const run of oldestFirst) {
    const c = out.get(run.memberId)
    if (c === undefined) {
      out.set(run.memberId, { memberId: run.memberId, runs: [run], titles: run.champion ? [run.year] : [], best: run, wins: run.wins, losses: run.losses, ties: run.ties })
      continue
    }
    c.runs.push(run)
    if (run.champion) c.titles.push(run.year)
    if (cupRunRank(run) >= cupRunRank(c.best)) c.best = run
    c.wins += run.wins
    c.losses += run.losses
    c.ties += run.ties
  }
  return out
}

/** The years `memberId` won the Cup, oldest first: the trophy case's diamonds. */
export function cupTitles(seasons: readonly SeasonData[], tournaments: readonly Tournament[], memberId: string): string[] {
  return cupRuns(seasons, tournaments)
    .filter((r) => r.memberId === memberId && r.champion)
    .map((r) => r.year)
    .sort()
}
