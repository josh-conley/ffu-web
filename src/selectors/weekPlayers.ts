import type { Tier } from '@/config'
import type { PlayerMap, SeasonLineups, TeamLineup } from '@/data'
import { optimalPoints } from './lineupEfficiency'

/**
 * The player-level half of a week's recap: the best start anyone had, and the points the rest of
 * us left sitting on the bench.
 *
 * Both come from the lineup files the Tuesday refresh backfills, so they are only available for
 * seasons that have them — the blocks disappear rather than guess when they don't.
 */

export interface WeekPlayer {
  playerId: string
  name: string
  position: string
  /** NFL team that week, when the lineup file resolved one. */
  nflTeam: string | undefined
  points: number
  /** The FFU manager who started them. */
  memberId: string
  tier: Tier
}

const describe = (playerId: string, players: PlayerMap) => ({
  name: players[playerId]?.name ?? playerId,
  position: players[playerId]?.position ?? '?',
})

/**
 * The week's highest-scoring STARTER across every roster in the Union, best first.
 *
 * Starters only: a bench player's points never happened as far as the league table is concerned,
 * and the block is about the week that was played, not the week that could have been (that's what
 * the bench block below is for).
 */
export function playersOfWeek(lineups: SeasonLineups[], players: PlayerMap, week: number, limit = 3): WeekPlayer[] {
  const rows: WeekPlayer[] = []
  for (const season of lineups) {
    const weekly = season.weeks.find((w) => w.week === week)
    if (weekly === undefined) continue
    for (const team of weekly.teams) {
      for (const player of team.starters) {
        rows.push({
          playerId: player.playerId,
          ...describe(player.playerId, players),
          nflTeam: player.team,
          points: player.points,
          memberId: team.memberId,
          tier: season.tier,
        })
      }
    }
  }
  return rows.sort((a, b) => b.points - a.points).slice(0, limit)
}

export interface BenchRegret {
  memberId: string
  tier: Tier
  /** Points the started lineup actually scored. */
  actual: number
  /** Best the roster could have scored in the same slots. */
  optimal: number
  /** optimal − actual: the points left on the bench. */
  lost: number
  /** The single biggest miss — the bench player who outscored a startable slot by the most. */
  worstCall: { name: string; position: string; points: number } | undefined
}

/** The bench player who scored most — the name the regret is really about. */
function topBench(team: TeamLineup, players: PlayerMap): BenchRegret['worstCall'] {
  const best = [...team.bench].sort((a, b) => b.points - a.points)[0]
  return best === undefined ? undefined : { ...describe(best.playerId, players), points: best.points }
}

/**
 * Who left the most points on the bench this week, worst first.
 *
 * Measured against the best lineup the SAME roster could have started (see `optimalPoints`) rather
 * than against hindsight's waiver wire — the complaint the league actually makes is about the
 * players you already had.
 */
export function benchRegrets(lineups: SeasonLineups[], players: PlayerMap, week: number, limit = 3): BenchRegret[] {
  const rows: BenchRegret[] = []
  for (const season of lineups) {
    const weekly = season.weeks.find((w) => w.week === week)
    if (weekly === undefined) continue
    for (const team of weekly.teams) {
      const actual = team.starters.reduce((sum, p) => sum + p.points, 0)
      const optimal = optimalPoints(team, season.slots, players)
      rows.push({
        memberId: team.memberId,
        tier: season.tier,
        actual,
        optimal,
        lost: optimal - actual,
        worstCall: topBench(team, players),
      })
    }
  }
  return rows
    .filter((row) => row.lost > 0)
    .sort((a, b) => b.lost - a.lost)
    .slice(0, limit)
}
