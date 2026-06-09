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

/** Bench, highest-scoring first (the "what they left on the bench" read). */
export function benchByPoints(team: TeamLineup): LineupPlayer[] {
  return [...team.bench].sort((a, b) => b.points - a.points)
}
