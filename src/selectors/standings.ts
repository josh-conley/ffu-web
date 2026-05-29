import type { Division, SeasonData, SeasonTeam, TeamRecord } from '@/data'

// Regular-season standings: order teams by record for DISPLAY. Uses the STORED (Sleeper)
// record/points so the table matches what owners see on Sleeper.
//
// Ported from the old ranking.ts, scoped to COMPLETED seasons (all current data): the tiebreaker
// chain is winPct → pointsFor → stable order. The old H2H tiebreaker and the division-leader
// PLAYOFF seeding (top-2 leaders seeded 1-2, 3rd-leader "bump") only ran for active seasons
// (`isActiveYear`) — that's the deferred active-season playoff-seeding concern, not regular-season
// standings. Add it back alongside live-season support when 2026 goes live.

export function winPct(record: TeamRecord): number {
  const games = record.wins + record.losses + record.ties
  return games > 0 ? (record.wins + record.ties * 0.5) / games : 0
}

/** Sort comparator for completed-season standings: winPct desc, then pointsFor desc. */
function compareForStandings(a: SeasonTeam, b: SeasonTeam): number {
  const aWin = winPct(a.record)
  const bWin = winPct(b.record)
  if (aWin !== bWin) return bWin - aWin
  if (a.points.for !== b.points.for) return b.points.for - a.points.for
  return 0
}

export interface StandingRow {
  team: SeasonTeam
  rank: number
  winPct: number
}

/** Two adjacent teams share a rank when winPct AND pointsFor are equal (per legacy assignRanks). */
function tiedWithPrevious(team: SeasonTeam, prev: SeasonTeam): boolean {
  return winPct(team.record) === winPct(prev.record) && team.points.for === prev.points.for
}

function assignRanks(sorted: SeasonTeam[]): StandingRow[] {
  const rows: StandingRow[] = []
  let rank = 1
  sorted.forEach((team, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && !tiedWithPrevious(team, prev)) rank = i + 1
    rows.push({ team, rank, winPct: winPct(team.record) })
  })
  return rows
}

/** Whole-season standings ordered by record (tie-aware ranks). */
export function regularSeasonStandings(season: SeasonData): StandingRow[] {
  return assignRanks([...season.teams].sort(compareForStandings))
}

export interface DivisionStandings {
  division: Division
  rows: StandingRow[]
}

/**
 * Standings grouped by division (only seasons with divisions — 2025). Each team keeps its overall
 * record-based rank; groups are sorted within division by that rank. Null when no divisions.
 */
export function standingsByDivision(season: SeasonData): DivisionStandings[] | null {
  if (season.divisions === undefined || season.divisions.length === 0) return null

  const byDivision = new Map<number, StandingRow[]>()
  for (const row of regularSeasonStandings(season)) {
    const id = row.team.divisionId
    if (id === undefined) continue
    let rows = byDivision.get(id)
    if (rows === undefined) {
      rows = []
      byDivision.set(id, rows)
    }
    rows.push(row)
  }

  return season.divisions.map((division) => ({
    division,
    rows: (byDivision.get(division.id) ?? []).sort((a, b) => a.rank - b.rank),
  }))
}
