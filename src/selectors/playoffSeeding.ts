import { PLAYOFF_FIELD } from '@/config'

// Playoff SEEDING for a Sleeper-era league, the way the league actually sets it (ported from the
// old ffu-app ranking.ts, which applied it to the active season only):
//
//   1. Teams are ordered by win% (a tie counts half a win).
//   2. A tie on record is broken HEAD TO HEAD: each tied team's record in the games between the
//      tied teams only. A multi-way tie that head to head splits only partly is re-broken among
//      whoever is still level; when head to head separates nobody, POINTS FOR decides.
//   3. Each division's winner is its best team by 1–2.
//   4. Seeds 1 and 2 are the two best division winners, ordered by 1–2 among the winners.
//   5. Everyone else — the remaining division winner included — is one pool, ordered by 1–2, for
//      seeds 3 onward.
//   6. That remaining division winner is GUARANTEED a playoff place: if the pool leaves it outside
//      the field, it takes the last playoff seed and everyone from there down moves one place.
//
// Pure over a list of results, so the same code seeds the real standings (played games) and the
// playoff machine (played games plus picked winners).

/** One regular-season result the seeding counts: a played game, or a winner picked in the machine. */
export interface SeedingResult {
  memberIds: readonly [string, string]
  /** null for a tie. */
  winnerId: string | null
  /** Points scored, in `memberIds` order. A picked (unplayed) result has none, so adds no points. */
  scores?: readonly [number, number]
}

export interface SeedingTeam {
  memberId: string
  divisionId?: number
}

/** What separated a team from others on its record: head to head, or points for once that didn't. */
export type TiebreakStep = 'h2h' | 'points'

export interface TeamLine {
  memberId: string
  divisionId?: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  winPct: number
}

export interface SeedRow extends TeamLine {
  seed: number
  divisionWinner: boolean
  /** A division winner lifted into the last playoff seed it would otherwise have missed (rule 6). */
  guaranteedSpot: boolean
  inPlayoffs: boolean
  bye: boolean
  /** Set when the team shared its record with another in its seeding pool: how that was broken. */
  tiebreak?: TiebreakStep
}

interface Ranked {
  line: TeamLine
  tiebreak?: TiebreakStep
}

export interface PlayoffField {
  teams: number
  byes: number
  divisionWinnerSeeds: number
}

/** Records and points for each team, from the results. */
export function tallyLines(teams: readonly SeedingTeam[], results: readonly SeedingResult[]): TeamLine[] {
  const lines = new Map<string, TeamLine>(
    teams.map(({ memberId, divisionId }) => [
      memberId,
      { memberId, ...(divisionId === undefined ? {} : { divisionId }), wins: 0, losses: 0, ties: 0, pointsFor: 0, winPct: 0 },
    ]),
  )
  for (const result of results) {
    result.memberIds.forEach((id, i) => {
      const line = lines.get(id)
      if (line === undefined) return
      if (result.winnerId === null) line.ties += 1
      else if (result.winnerId === id) line.wins += 1
      else line.losses += 1
      line.pointsFor += result.scores?.[i] ?? 0
    })
  }
  for (const line of lines.values()) line.winPct = pct(line.wins, line.losses, line.ties)
  return [...lines.values()]
}

function pct(wins: number, losses: number, ties: number): number {
  const games = wins + losses + ties
  return games === 0 ? 0 : (wins + ties * 0.5) / games
}

/** Float-safe equality key: 4-4 and 5-5 are the same win%, and must group together. */
const pctKey = (value: number) => Math.round(value * 1e6)

/** Groups lines sharing a key, best (highest key) group first; input order kept within a group. */
function groupDescending(lines: readonly TeamLine[], key: (line: TeamLine) => number): TeamLine[][] {
  const groups = new Map<number, TeamLine[]>()
  for (const line of lines) {
    const k = key(line)
    groups.set(k, [...(groups.get(k) ?? []), line])
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([, group]) => group)
}

/**
 * A team's win% in the games among `group` only. A team that has met none of them yet sits at .500:
 * neutral, rather than ranked below a team that has played and lost.
 */
function headToHeadPct(memberId: string, group: ReadonlySet<string>, results: readonly SeedingResult[]): number {
  let wins = 0
  let losses = 0
  let ties = 0
  for (const { memberIds, winnerId } of results) {
    const [a, b] = memberIds
    const opponent = a === memberId ? b : b === memberId ? a : undefined
    if (opponent === undefined || !group.has(opponent)) continue
    if (winnerId === null) ties += 1
    else if (winnerId === memberId) wins += 1
    else losses += 1
  }
  return wins + losses + ties === 0 ? 0.5 : pct(wins, losses, ties)
}

/** Orders teams level on record: head to head over the whole tied group, then points for. */
function breakTie(group: readonly TeamLine[], results: readonly SeedingResult[]): Ranked[] {
  const ids = new Set(group.map((l) => l.memberId))
  const tiers = groupDescending(group, (l) => pctKey(headToHeadPct(l.memberId, ids, results)))
  return tiers.flatMap((tier): Ranked[] =>
    tier.length === 1
      ? [{ line: tier[0]!, tiebreak: 'h2h' }]
      : [...tier].sort((a, b) => b.pointsFor - a.pointsFor).map((line) => ({ line, tiebreak: 'points' })),
  )
}

/** Orders a pool of teams by record, ties broken by `breakTie` within the pool. */
export function rankByRecord(lines: readonly TeamLine[], results: readonly SeedingResult[]): Ranked[] {
  return groupDescending(lines, (l) => pctKey(l.winPct)).flatMap((group) =>
    group.length === 1 ? [{ line: group[0]! }] : breakTie(group, results),
  )
}

/** Rule 6: division winners the pool left outside its `spots` take the last of them, in pool order. */
function liftDivisionWinners(pool: Ranked[], winnerIds: ReadonlySet<string>, spots: number) {
  const outside = pool.slice(Math.max(spots, 0)).filter((r) => winnerIds.has(r.line.memberId))
  const lifted = new Set(outside.map((r) => r.line.memberId))
  if (lifted.size === 0) return { order: pool, lifted }
  const others = pool.filter((r) => !lifted.has(r.line.memberId))
  const cut = spots - outside.length
  const moved = outside.map((r) => ({ line: r.line }))
  return { order: [...others.slice(0, cut), ...moved, ...others.slice(cut)], lifted }
}

function toRows(order: Ranked[], winnerIds: ReadonlySet<string>, lifted: ReadonlySet<string>, field: PlayoffField): SeedRow[] {
  return order.map(({ line, tiebreak }, i) => ({
    ...line,
    seed: i + 1,
    divisionWinner: winnerIds.has(line.memberId),
    guaranteedSpot: lifted.has(line.memberId),
    inPlayoffs: i < field.teams,
    bye: i < field.byes,
    ...(tiebreak === undefined ? {} : { tiebreak }),
  }))
}

/** Every team's seed, 1 to N, under the league's rules (see the top of this file). */
export function playoffSeeding(
  teams: readonly SeedingTeam[],
  results: readonly SeedingResult[],
  field: PlayoffField = PLAYOFF_FIELD,
): SeedRow[] {
  const lines = tallyLines(teams, results)
  const divisionIds = [...new Set(lines.flatMap((l) => (l.divisionId === undefined ? [] : [l.divisionId])))]
  if (divisionIds.length === 0) return toRows(rankByRecord(lines, results), new Set(), new Set(), field)

  const winners = divisionIds.flatMap((id) => rankByRecord(lines.filter((l) => l.divisionId === id), results)[0]?.line ?? [])
  const rankedWinners = rankByRecord(winners, results)
  const top = rankedWinners.slice(0, field.divisionWinnerSeeds)
  const topIds = new Set(top.map((r) => r.line.memberId))
  const winnerIds = new Set(winners.map((w) => w.memberId))
  const pool = rankByRecord(lines.filter((l) => !topIds.has(l.memberId)), results)
  const { order, lifted } = liftDivisionWinners(pool, winnerIds, field.teams - top.length)
  return toRows([...top, ...order], winnerIds, lifted, field)
}
