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

/**
 * What the starters have scored. The stored game score is the number to show whenever there is one;
 * this is for a lineup with no game behind it yet — an in-progress or upcoming week, where the box
 * score is fetched live and the total has to come from the lineup itself.
 */
export function starterPoints(team: TeamLineup): number {
  return Math.round(team.starters.reduce((total, p) => total + p.points, 0) * 100) / 100
}

/** Bench, highest-scoring first (the "what they left on the bench" read). */
export function benchByPoints(team: TeamLineup): LineupPlayer[] {
  return [...team.bench].sort((a, b) => b.points - a.points)
}
