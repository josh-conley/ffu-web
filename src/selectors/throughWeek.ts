import type { SeasonData, SeasonTeam } from '@/data'
import { regularSeasonTotals, type TeamTotals } from './games'
import { seasonUpr } from './upr'

// The union as it stood at the end of a given week — so a question like "what did week 6 change?"
// is answered by comparing two ordinary snapshots with the ordinary selectors, rather than by a
// second, week-aware copy of every career calculation.

/**
 * One team's season with the games after the cut-off taken back out.
 *
 * Team totals are Sleeper's stored aggregates (see SeasonTeam), so they are rewound by SUBTRACTING
 * what the dropped games contributed rather than re-summed from the games that remain: the two can
 * differ by a few points in historical data, and mixing them would let a total jump across a
 * milestone that no game actually crossed. The final placing goes too — the playoffs decide it, so
 * it is not yet known at any week that still has games after it.
 */
function rewindTeam(team: SeasonTeam, undo: TeamTotals | undefined): SeasonTeam {
  const rewound: SeasonTeam = {
    ...team,
    record: {
      wins: team.record.wins - (undo?.wins ?? 0),
      losses: team.record.losses - (undo?.losses ?? 0),
      ties: team.record.ties - (undo?.ties ?? 0),
    },
    points: {
      for: team.points.for - (undo?.pointsFor ?? 0),
      against: team.points.against - (undo?.pointsAgainst ?? 0),
    },
  }
  delete rewound.finalPlacement
  delete rewound.placementName
  return rewound
}

function seasonThroughWeek(season: SeasonData, week: number): SeasonData {
  const later = season.games.filter((g) => g.week > week)
  if (later.length === 0) return season
  const undo = regularSeasonTotals({ games: later })
  return {
    ...season,
    games: season.games.filter((g) => g.week <= week),
    teams: season.teams.map((t) => rewindTeam(t, undo.get(t.memberId))),
  }
}

/**
 * Every season as it stood once `week` of `year` was over: later years dropped, and `year`'s own
 * seasons rewound past any games after that week. Week 0 is "before the season", which leaves the
 * year with no games and so — per hasBeenPlayed — out of every career total.
 */
export function seasonsThroughWeek(seasons: SeasonData[], year: string, week: number): SeasonData[] {
  return seasons
    .filter((s) => Number(s.year) <= Number(year))
    .map((s) => (s.year === year ? seasonThroughWeek(s, week) : s))
}

/** A team's season so far: its regular-season totals and its UPR (undefined until UPR is rated). */
export interface TeamForm {
  totals: TeamTotals
  upr: number | undefined
}

/**
 * Each team's record and UPR going into `week`: their league's regular-season games before it.
 * The same numbers a live matchup card shows under each team (record + UPR through the last
 * completed week), for a game picked out of any league — a Cup game's two teams each carry their
 * own league's. Pass one year's seasons; a team in none of them has no entry.
 */
export function formGoingInto(seasons: readonly SeasonData[], week: number): Map<string, TeamForm> {
  const out = new Map<string, TeamForm>()
  for (const season of seasons) {
    const before = { games: season.games.filter((g) => g.week < week) }
    const upr = seasonUpr(before)
    for (const [id, totals] of regularSeasonTotals(before)) out.set(id, { totals, upr: upr.get(id) })
  }
  return out
}
