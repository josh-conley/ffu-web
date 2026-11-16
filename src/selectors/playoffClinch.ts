import { PLAYOFF_FIELD } from '@/config'
import type { TeamLine } from './playoffTiebreak'
import type { PlayoffField } from './playoffSeeding'

// What a team has locked up (or lost) whatever happens in the games still open.
//
// Sound, not exhaustive: every mark is CERTAIN, but tiebreakers are never counted in a team's
// favour, so a clinch can show a little later than it strictly could. Enumerating every outcome is
// out of reach mid-season (24 open games is 16.7 million), and the bounds below need no search.
//
// One fact makes them simple. With one division winner per division and every winner guaranteed a
// place (seeds 1–2, plus rule 5 in playoffSeeding.ts), the field is ALWAYS the division winners plus
// the best `field.teams − divisions` of everyone else. So a team is in exactly when it wins its
// division or finishes among those few "wild cards".
//
// Records are compared on wins + half a tie. Everyone plays the same number of games, so the final
// order on that is the final order on win%. A team's best finish wins every open game it's in; its
// worst loses them all.

export type ClinchStatus = 'bye' | 'division' | 'playoffs' | 'eliminated'

interface Range {
  line: TeamLine
  min: number
  max: number
}

/**
 * Of the `others`, the most that can be NON-division-winners at once: in each division, one of them
 * would be that division's winner (anyone level with or ahead of a team is level with or behind its
 * division winner, who is then in the set too).
 */
function wildCardsAmong(others: readonly Range[]): number {
  const byDivision = new Map<number | undefined, number>()
  for (const o of others) byDivision.set(o.line.divisionId, (byDivision.get(o.line.divisionId) ?? 0) + 1)
  return [...byDivision.values()].reduce((sum, n) => sum + Math.max(0, n - 1), 0)
}

function statusOf(team: Range, all: readonly Range[], divisions: number, field: PlayoffField): ClinchStatus | undefined {
  const others = all.filter((o) => o !== team)
  const rivals = others.filter((o) => o.line.divisionId === team.line.divisionId)
  const wildCardSpots = field.teams - divisions
  const canCatch = others.filter((o) => o.max >= team.min)
  const alwaysAhead = others.filter((o) => o.min > team.max)

  const wonDivision = rivals.every((o) => o.max < team.min)
  if (wonDivision) {
    // Other divisions whose winner could finish level with or ahead of this team.
    const threats = new Set(canCatch.filter((o) => o.line.divisionId !== team.line.divisionId).map((o) => o.line.divisionId))
    return threats.size < field.byes ? 'bye' : 'division'
  }
  if (wildCardsAmong(canCatch) < wildCardSpots) return 'playoffs'
  const lostDivision = rivals.some((o) => o.min > team.max)
  if (lostDivision && wildCardsAmong(alwaysAhead) >= wildCardSpots) return 'eliminated'
  return undefined
}

/** Without divisions the field is simply the best `field.teams` records. */
function statusWithoutDivisions(team: Range, all: readonly Range[], field: PlayoffField): ClinchStatus | undefined {
  const others = all.filter((o) => o !== team)
  if (others.filter((o) => o.max >= team.min).length < field.teams) return 'playoffs'
  if (others.filter((o) => o.min > team.max).length >= field.teams) return 'eliminated'
  return undefined
}

/**
 * Each team's locked-in status. `lines` are the records so far (played games, plus any picked
 * winners); `open` are the fixtures still undecided. Teams with nothing settled are left out.
 */
export function clinchStatuses(
  lines: readonly TeamLine[],
  open: readonly (readonly [string, string])[],
  field: PlayoffField = PLAYOFF_FIELD,
): Map<string, ClinchStatus> {
  const games = new Map<string, number>()
  for (const pair of open) for (const id of pair) games.set(id, (games.get(id) ?? 0) + 1)
  const ranges: Range[] = lines.map((line) => {
    const min = line.wins + line.ties * 0.5
    return { line, min, max: min + (games.get(line.memberId) ?? 0) }
  })
  const divisions = new Set(lines.flatMap((l) => (l.divisionId === undefined ? [] : [l.divisionId]))).size
  const out = new Map<string, ClinchStatus>()
  for (const team of ranges) {
    const status = divisions === 0 ? statusWithoutDivisions(team, ranges, field) : statusOf(team, ranges, divisions, field)
    if (status) out.set(team.line.memberId, status)
  }
  return out
}
