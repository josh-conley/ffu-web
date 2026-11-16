// Ordering teams by record, with the league's tiebreakers (see playoffSeeding.ts for where each
// pool comes from). A tie on record is broken HEAD TO HEAD: each tied team's record in the games
// between the tied teams only, taken over the whole tied group at once. Whoever that leaves level
// is ordered by POINTS FOR. Head to head is not re-applied to the teams it leaves level: that
// variant gets the 2025 Masters bracket wrong (DECISIONS 2026-11-16).
//
// Every tie keeps its working (who was level, their head-to-head records, their points) so the page
// can show why a team landed where it did.

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

export interface WinLossTie {
  wins: number
  losses: number
  ties: number
}

export interface TeamLine extends WinLossTie {
  memberId: string
  divisionId?: number
  pointsFor: number
  winPct: number
}

/** What placed a team among others level on its record: head to head, or points for once that was level. */
export type TiebreakStep = 'h2h' | 'points'

/** A tied team's working: its record against the other tied teams, and its points. */
export interface TieTeam {
  memberId: string
  headToHead: WinLossTie
  pointsFor: number
}

export interface Tie {
  /** What decided THIS team's place in the group. */
  step: TiebreakStep
  /** The shared record. */
  record: WinLossTie
  /** Everyone level on that record, in the order the tiebreak put them. */
  teams: TieTeam[]
}

export interface Ranked {
  line: TeamLine
  tie?: Tie
}

export function winPctOf({ wins, losses, ties }: WinLossTie): number {
  const games = wins + losses + ties
  return games === 0 ? 0 : (wins + ties * 0.5) / games
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
  for (const line of lines.values()) line.winPct = winPctOf(line)
  return [...lines.values()]
}

/** Float-safe equality key: 4-4 and 5-5 are the same win%, and must group together. */
const pctKey = (value: number) => Math.round(value * 1e6)

/** Groups items sharing a key, best (highest key) group first; input order kept within a group. */
function groupDescending<T>(items: readonly T[], key: (item: T) => number): T[][] {
  const groups = new Map<number, T[]>()
  for (const item of items) {
    const k = key(item)
    groups.set(k, [...(groups.get(k) ?? []), item])
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([, group]) => group)
}

/** A team's record in the games against members of `group` only. */
function headToHead(memberId: string, group: ReadonlySet<string>, results: readonly SeedingResult[]): WinLossTie {
  const record = { wins: 0, losses: 0, ties: 0 }
  for (const { memberIds, winnerId } of results) {
    const [a, b] = memberIds
    const opponent = a === memberId ? b : b === memberId ? a : undefined
    if (opponent === undefined || !group.has(opponent)) continue
    if (winnerId === null) record.ties += 1
    else if (winnerId === memberId) record.wins += 1
    else record.losses += 1
  }
  return record
}

/** A team that has met none of the others yet sits at .500: neutral, not below one that played and lost. */
function headToHeadPct(record: WinLossTie): number {
  return record.wins + record.losses + record.ties === 0 ? 0.5 : winPctOf(record)
}

/** Orders a group level on record: head to head over the whole group, then points for. */
function breakTie(group: readonly TeamLine[], results: readonly SeedingResult[]): Ranked[] {
  const ids = new Set(group.map((l) => l.memberId))
  const records = new Map(group.map((l) => [l.memberId, headToHead(l.memberId, ids, results)]))
  const tiers = groupDescending(group, (l) => pctKey(headToHeadPct(records.get(l.memberId)!)))
  const placed = tiers.flatMap((tier) =>
    tier.length === 1
      ? [{ line: tier[0]!, step: 'h2h' as TiebreakStep }]
      : [...tier].sort((a, b) => b.pointsFor - a.pointsFor).map((line) => ({ line, step: 'points' as TiebreakStep })),
  )
  const first = group[0]!
  const record = { wins: first.wins, losses: first.losses, ties: first.ties }
  const teams = placed.map(({ line }) => ({ memberId: line.memberId, headToHead: records.get(line.memberId)!, pointsFor: line.pointsFor }))
  return placed.map(({ line, step }) => ({ line, tie: { step, record, teams } }))
}

/** Orders a pool of teams by record, ties broken within the pool. */
export function rankByRecord(lines: readonly TeamLine[], results: readonly SeedingResult[]): Ranked[] {
  return groupDescending(lines, (l) => pctKey(l.winPct)).flatMap((group) =>
    group.length === 1 ? [{ line: group[0]! }] : breakTie(group, results),
  )
}

/** The others in `tie` whose head-to-head record matched `memberId`'s, so points for decided between them. */
export function levelOnHeadToHead(tie: Tie, memberId: string): string[] {
  const own = tie.teams.find((t) => t.memberId === memberId)
  if (own === undefined) return []
  const key = pctKey(headToHeadPct(own.headToHead))
  return tie.teams.filter((t) => t.memberId !== memberId && pctKey(headToHeadPct(t.headToHead)) === key).map((t) => t.memberId)
}
