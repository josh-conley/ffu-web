import type { Tier } from '@/config'
import type { SeasonData, SeasonTeam } from '@/data'
import { seasonsThroughWeek } from './throughWeek'
import { rankedByUpr, unionStandings } from './unionStandings'

// The FFUN's weekly Union Power Rating table: all 36 teams ranked by UPR as of a week, each with
// how many places it moved since the week before. Built on the Union standings (one ranking, one
// place) rather than re-sorting UPRs here.

export interface UprTableRow {
  memberId: string
  tier: Tier
  /** Union rank by UPR; ties share it. */
  rank: number
  upr: number
  record: SeasonTeam['record']
  /** Places climbed since the previous week (negative = fell). Undefined when that week had no
   *  UPR yet: the first rated week has nothing to move from. */
  move: number | undefined
}

/** memberId → Union rank as of `week`, or undefined when that week isn't rated by UPR yet. */
function ranksAt(yearSeasons: SeasonData[], year: string, week: number): Map<string, number> | undefined {
  const rows = unionStandings(seasonsThroughWeek(yearSeasons, year, week))
  return rankedByUpr(rows) ? new Map(rows.map((r) => [r.team.memberId, r.rank])) : undefined
}

/**
 * The table as of `week` of `year` (`yearSeasons` is that year's leagues). Empty until the season
 * has earned a UPR (see UPR_MIN_WEEKS) — a table of 36 unrated teams says nothing.
 */
export function uprTable(yearSeasons: SeasonData[], year: string, week: number): UprTableRow[] {
  const rows = unionStandings(seasonsThroughWeek(yearSeasons, year, week))
  if (!rankedByUpr(rows)) return []
  const before = week > 1 ? ranksAt(yearSeasons, year, week - 1) : undefined
  return rows.map((r) => {
    const was = before?.get(r.team.memberId)
    return {
      memberId: r.team.memberId,
      tier: r.tier,
      rank: r.rank,
      upr: r.upr,
      record: r.team.record,
      move: was === undefined ? undefined : was - r.rank,
    }
  })
}
