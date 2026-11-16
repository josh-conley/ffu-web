import { PLAYOFF_FIELD } from '@/config'
import { rankByRecord, tallyLines, type Ranked, type SeedingResult, type SeedingTeam, type TeamLine, type Tie } from './playoffTiebreak'

// Playoff SEEDING for a Sleeper-era league, the way the league actually sets it (ported from the
// old ffu-app ranking.ts, which applied it to the active season only; checked against every
// Sleeper-era bracket, DECISIONS 2026-11-16):
//
//   1. Teams are ordered by win% (a tie counts half a win), ties broken head to head and then by
//      points for (playoffTiebreak.ts).
//   2. Each division's winner is its best team by 1.
//   3. Seeds 1 and 2 are the two best division winners, ordered by 1 among the winners.
//   4. Everyone else — the remaining division winner included — is one pool, ordered by 1, for
//      seeds 3 onward.
//   5. That remaining division winner is GUARANTEED a playoff place: if the pool leaves it outside
//      the field, it takes the last playoff seed and everyone from there down moves one place.
//
// Pure over a list of results, so the same code seeds the real standings (played games) and the
// playoff machine (played games plus picked winners).

/**
 * Where a tie was broken: for a division title, among the division winners (for seeds 1–2), or in
 * the pool for every other seed.
 */
export type TieContext = 'division' | 'divisionWinners' | 'field'

export interface SeedTie extends Tie {
  context: TieContext
}

export interface SeedRow extends TeamLine {
  seed: number
  /** Place within its own division, 1 = the division winner. */
  divisionRank: number
  divisionWinner: boolean
  /** A division winner lifted into the last playoff seed it would otherwise have missed (rule 5). */
  guaranteedSpot: boolean
  inPlayoffs: boolean
  bye: boolean
  /**
   * Every tie that shaped this team's place, in the order they were applied: a division title that
   * went to a tiebreak, the division winners' order for the byes, and its own seeding pool. Empty
   * when its record set it apart each time.
   */
  tiebreaks: SeedTie[]
}

export interface PlayoffField {
  teams: number
  byes: number
  divisionWinnerSeeds: number
}


/** Rule 5: division winners the pool left outside its `spots` take the last of them, in pool order. */
function liftDivisionWinners(pool: Ranked[], winnerIds: ReadonlySet<string>, spots: number) {
  const outside = pool.slice(Math.max(spots, 0)).filter((r) => winnerIds.has(r.line.memberId))
  const lifted = new Set(outside.map((r) => r.line.memberId))
  if (lifted.size === 0) return { order: pool, lifted }
  const others = pool.filter((r) => !lifted.has(r.line.memberId))
  const cut = spots - outside.length
  // A lifted team's place comes from rule 5, not from the tie it may have lost in the pool.
  const moved = outside.map((r) => ({ line: r.line }))
  return { order: [...others.slice(0, cut), ...moved, ...others.slice(cut)], lifted }
}

interface DivisionRace {
  rank: number
  /** The tie that decided the title, for the teams that were in it. */
  titleTie?: Tie
}

/** Each team's place in its division, and each division's winner. */
function divisionRaces(lines: readonly TeamLine[], results: readonly SeedingResult[]) {
  const races = new Map<string, DivisionRace>()
  const winners: TeamLine[] = []
  const divisionIds = [...new Set(lines.flatMap((l) => (l.divisionId === undefined ? [] : [l.divisionId])))]
  for (const id of divisionIds) {
    const ranked = rankByRecord(lines.filter((l) => l.divisionId === id), results)
    const titleTie = ranked[0]?.tie
    const inTitleTie = new Set(titleTie?.teams.map((t) => t.memberId))
    ranked.forEach((r, i) => {
      const tie = inTitleTie.has(r.line.memberId) ? r.tie : undefined
      races.set(r.line.memberId, { rank: i + 1, ...(tie === undefined ? {} : { titleTie: tie }) })
    })
    if (ranked[0]) winners.push(ranked[0].line)
  }
  return { races, winners }
}

/** A team's ties in the order applied (division, then winners, then its seeding pool). */
function tiesOf(memberId: string, race: DivisionRace | undefined, winnersTie: Tie | undefined, seedTie: SeedTie | undefined): SeedTie[] {
  const ties: SeedTie[] = []
  if (race?.titleTie) ties.push({ ...race.titleTie, context: 'division' })
  if (winnersTie && seedTie?.context !== 'divisionWinners') ties.push({ ...winnersTie, context: 'divisionWinners' })
  if (seedTie) ties.push(seedTie)
  return ties.filter((t) => t.teams.some((team) => team.memberId === memberId))
}

interface Seeded extends Ranked {
  context: TieContext
}

function toRows(
  order: Seeded[],
  context: { races: Map<string, DivisionRace>; winnersTies: Map<string, Tie>; winnerIds: ReadonlySet<string>; lifted: ReadonlySet<string> },
  field: PlayoffField,
): SeedRow[] {
  const { races, winnersTies, winnerIds, lifted } = context
  return order.map(({ line, tie, context: pool }, i) => {
    const race = races.get(line.memberId)
    const seedTie = tie === undefined ? undefined : { ...tie, context: pool }
    return {
      ...line,
      seed: i + 1,
      divisionRank: race?.rank ?? 1,
      divisionWinner: winnerIds.has(line.memberId),
      guaranteedSpot: lifted.has(line.memberId),
      inPlayoffs: i < field.teams,
      bye: i < field.byes,
      tiebreaks: tiesOf(line.memberId, race, winnersTies.get(line.memberId), seedTie),
    }
  })
}

const inPool = (context: TieContext) => (r: Ranked): Seeded => ({ ...r, context })

/** Every team's seed, 1 to N, under the league's rules (see the top of this file). */
export function playoffSeeding(
  teams: readonly SeedingTeam[],
  results: readonly SeedingResult[],
  field: PlayoffField = PLAYOFF_FIELD,
): SeedRow[] {
  const lines = tallyLines(teams, results)
  const { races, winners } = divisionRaces(lines, results)
  const none = { races, winnersTies: new Map<string, Tie>(), winnerIds: new Set<string>(), lifted: new Set<string>() }
  if (winners.length === 0) return toRows(rankByRecord(lines, results).map(inPool('field')), none, field)

  const rankedWinners = rankByRecord(winners, results)
  const winnersTies = new Map(rankedWinners.flatMap((r) => (r.tie === undefined ? [] : [[r.line.memberId, r.tie] as const])))
  const top = rankedWinners.slice(0, field.divisionWinnerSeeds).map(inPool('divisionWinners'))
  const topIds = new Set(top.map((r) => r.line.memberId))
  const winnerIds = new Set(winners.map((w) => w.memberId))
  const pool = rankByRecord(lines.filter((l) => !topIds.has(l.memberId)), results)
  const { order, lifted } = liftDivisionWinners(pool, winnerIds, field.teams - top.length)
  return toRows([...top, ...order.map(inPool('field'))], { races, winnersTies, winnerIds, lifted }, field)
}
