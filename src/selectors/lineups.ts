import type { LineupPlayer, SeasonLineups, TeamLineup } from '@/data'

// Derivations over a season's lineups. Pure; the modal composes these with the player map.

/** The two teams' lineups for one game (its week + the two memberIds), in the order given. */
export function gameLineups(lineups: SeasonLineups, week: number, memberIds: string[]): TeamLineup[] {
  const wk = lineups.weeks.find((w) => w.week === week)
  if (!wk) return []
  return memberIds
    .map((id) => wk.teams.find((t) => t.memberId === id))
    .filter((t): t is TeamLineup => Boolean(t))
}

/** The players actually started — the lineup's starters without its empty slots. */
export function startedPlayers(team: TeamLineup): LineupPlayer[] {
  return team.starters.filter((p): p is LineupPlayer => p !== null)
}

/**
 * What the starters have scored. The stored game score is the number to show whenever there is one;
 * this is for a lineup with no game behind it yet — an in-progress or upcoming week, where the box
 * score is fetched live and the total has to come from the lineup itself.
 */
export function starterPoints(team: TeamLineup): number {
  return Math.round(startedPlayers(team).reduce((total, p) => total + p.points, 0) * 100) / 100
}

/** Bench, highest-scoring first (the "what they left on the bench" read). */
export function benchByPoints(team: TeamLineup): LineupPlayer[] {
  return [...team.bench].sort((a, b) => b.points - a.points)
}

/**
 * A team's latest lineup on file, and its week: the closest the season files come to "who they
 * have now" (they hold weekly lineups, not rosters). The pick'em modal shows it as each team's roster.
 */
export function latestLineup(lineups: SeasonLineups, memberId: string): { week: number; lineup: TeamLineup } | undefined {
  for (let i = lineups.weeks.length - 1; i >= 0; i--) {
    const week = lineups.weeks[i]!
    const lineup = week.teams.find((t) => t.memberId === memberId)
    if (lineup) return { week: week.week, lineup }
  }
  return undefined
}
