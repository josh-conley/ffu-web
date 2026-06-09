import type { PlayerMap, SeasonLineups, TeamLineup } from '@/data'

// Lineup efficiency: how close each started lineup came to the best possible lineup from the
// full roster that week (starters + bench). Lineups exist only for game weeks (the backfill
// stores matchup participants), so every week here is a game that counted.

/**
 * Positions that may fill each starting slot. FB rosters as a running back on Sleeper.
 * Slot names come from `SeasonLineups.slots`; a name missing here (future K, SUPER_FLEX…)
 * still works — players are always eligible for the slot they were actually started in.
 */
const SLOT_ELIGIBILITY: Record<string, readonly string[]> = {
  QB: ['QB'],
  RB: ['RB', 'FB'],
  WR: ['WR'],
  TE: ['TE'],
  FLEX: ['RB', 'FB', 'WR', 'TE'],
  DEF: ['DEF'],
}

export interface WeekEfficiency {
  week: number
  /** Points the started lineup scored. */
  actual: number
  /** Best possible points from the full roster (starters + bench) in the same slots. */
  optimal: number
  /** Points left on the bench: `optimal - actual`. */
  lost: number
}

export interface SeasonEfficiency {
  memberId: string
  weeks: WeekEfficiency[]
  actual: number
  optimal: number
  lost: number
  /** actual / optimal across the season (1 when there was nothing to gain). */
  efficiency: number
}

interface Candidate {
  points: number
  position: string
  /** Slot the player actually occupied (bench players have none) — always eligible there. */
  startedSlot?: string
}

const eligible = (c: Candidate, slot: string) =>
  c.startedSlot === slot || (SLOT_ELIGIBILITY[slot] ?? []).includes(c.position)

/**
 * Best possible points for one team-week. Greedy by slot restrictiveness: dedicated slots
 * (QB/RB/WR/TE/DEF) are filled with their best eligible players first, FLEX takes the best of
 * what remains — exact for this nested-eligibility structure, since every FLEX-eligible player
 * is also dedicated-eligible. Clamped to >= actual (the started lineup is itself feasible).
 */
export function optimalPoints(team: TeamLineup, slots: string[], players: PlayerMap): number {
  const pool: Candidate[] = [
    ...team.starters.map((p, i) => ({ points: p.points, position: players[p.playerId]?.position ?? '?', startedSlot: slots[i] })),
    ...team.bench.map((p) => ({ points: p.points, position: players[p.playerId]?.position ?? '?' })),
  ]
  // Group repeated slots (RB, RB → RB×2), then fill most-restrictive groups first.
  const groups = new Map<string, number>()
  for (const s of slots) groups.set(s, (groups.get(s) ?? 0) + 1)
  const ordered = [...groups.entries()].sort(
    (a, b) => (SLOT_ELIGIBILITY[a[0]]?.length ?? Infinity) - (SLOT_ELIGIBILITY[b[0]]?.length ?? Infinity),
  )
  let remaining = pool
  let total = 0
  for (const [slot, count] of ordered) {
    const picks = remaining
      .filter((c) => eligible(c, slot))
      .sort((a, b) => b.points - a.points)
      .slice(0, count)
    for (const p of picks) total += p.points
    remaining = remaining.filter((c) => !picks.includes(c))
  }
  const actual = team.starters.reduce((sum, p) => sum + p.points, 0)
  return Math.max(total, actual)
}

/** Per-member efficiency across a season's game weeks. */
export function seasonEfficiency(lineups: SeasonLineups, players: PlayerMap): Map<string, SeasonEfficiency> {
  const byMember = new Map<string, SeasonEfficiency>()
  for (const wk of lineups.weeks) {
    for (const team of wk.teams) {
      const actual = team.starters.reduce((sum, p) => sum + p.points, 0)
      const optimal = optimalPoints(team, lineups.slots, players)
      const week: WeekEfficiency = { week: wk.week, actual, optimal, lost: optimal - actual }
      const entry = byMember.get(team.memberId) ?? { memberId: team.memberId, weeks: [], actual: 0, optimal: 0, lost: 0, efficiency: 1 }
      entry.weeks.push(week)
      entry.actual += actual
      entry.optimal += optimal
      entry.lost += week.lost
      byMember.set(team.memberId, entry)
    }
  }
  for (const entry of byMember.values()) entry.efficiency = entry.optimal > 0 ? entry.actual / entry.optimal : 1
  return byMember
}

export interface CareerEfficiency {
  memberId: string
  games: number
  actual: number
  optimal: number
  lost: number
  efficiency: number
  lostPerGame: number
}

/** Aggregate efficiency across many seasons' lineups (the All-Time Stats career view). */
export function careerEfficiency(seasons: SeasonLineups[], players: PlayerMap): Map<string, CareerEfficiency> {
  const byMember = new Map<string, CareerEfficiency>()
  for (const lineups of seasons) {
    for (const s of seasonEfficiency(lineups, players).values()) {
      const entry = byMember.get(s.memberId) ?? { memberId: s.memberId, games: 0, actual: 0, optimal: 0, lost: 0, efficiency: 1, lostPerGame: 0 }
      entry.games += s.weeks.length
      entry.actual += s.actual
      entry.optimal += s.optimal
      entry.lost += s.lost
      byMember.set(s.memberId, entry)
    }
  }
  for (const entry of byMember.values()) {
    entry.efficiency = entry.optimal > 0 ? entry.actual / entry.optimal : 1
    entry.lostPerGame = entry.games > 0 ? entry.lost / entry.games : 0
  }
  return byMember
}
