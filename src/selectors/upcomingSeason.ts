import type { Tier } from '@/config/types'
import type { LeagueRosterSummary, SeasonData } from '@/data'

// How each franchise arrived in the league it will play next season — derived by comparing the
// upcoming rosters (live from Sleeper) against the last COMPLETED season's tiers. Never stored:
// the `promoted`/`relegated` flags on SeasonTeam describe what happened at the END of a played
// season, which is a different (and, until the commissioner finalizes moves, sometimes divergent)
// fact from where a manager actually ended up signed up.

const TIER_ORDER: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

export type Movement = 'promoted' | 'relegated' | 'stayed' | 'returning' | 'new'

export interface UpcomingTeam {
  memberId: string
  movement: Movement
  /** The tier they last played in — undefined only for a first-time member. */
  fromTier?: Tier
  /** The season `fromTier` refers to: the prior season, or an older one when `returning`. */
  fromYear?: string
}

export interface UpcomingRoster {
  tier: Tier
  year: string
  teams: UpcomingTeam[]
  /** Slots the commissioner hasn't filled yet. */
  openSlots: number
  /** Managers on a roster who aren't in the member registry yet (dropped from `teams`). */
  unregistered: number
}

interface LastSeason {
  year: string
  tier: Tier
}

/** Each member's most recent completed season (year + tier). */
function lastSeasonByMember(seasons: SeasonData[]): Map<string, LastSeason> {
  const last = new Map<string, LastSeason>()
  for (const season of seasons) {
    for (const team of season.teams) {
      const prev = last.get(team.memberId)
      if (prev === undefined || Number(season.year) > Number(prev.year)) {
        last.set(team.memberId, { year: season.year, tier: season.tier })
      }
    }
  }
  return last
}

function movementFor(tier: Tier, priorYear: string, last: LastSeason | undefined): Movement {
  if (last === undefined) return 'new'
  if (last.year !== priorYear) return 'returning' // sat out at least a season
  if (last.tier === tier) return 'stayed'
  return TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(last.tier) ? 'promoted' : 'relegated'
}

/**
 * Annotate each upcoming-season roster with how its members got there. Rosters keep Sleeper's
 * order (display ordering is a view concern). Returns [] when there is no completed season to
 * compare against, since every movement label would be meaningless.
 */
export function upcomingRosters(seasons: SeasonData[], rosters: LeagueRosterSummary[]): UpcomingRoster[] {
  const years = seasons.map((s) => Number(s.year))
  if (years.length === 0) return []
  const priorYear = String(Math.max(...years))
  const last = lastSeasonByMember(seasons)

  return rosters.map((roster) => ({
    tier: roster.tier,
    year: roster.year,
    openSlots: roster.totalRosters - roster.claimed,
    unregistered: roster.claimed - roster.memberIds.length,
    teams: roster.memberIds.map((memberId) => {
      const prev = last.get(memberId)
      return {
        memberId,
        movement: movementFor(roster.tier, priorYear, prev),
        ...(prev ? { fromTier: prev.tier, fromYear: prev.year } : {}),
      }
    }),
  }))
}
