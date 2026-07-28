import type { Tier } from '@/config/types'
import { memberBySleeperId } from '@/config'
import type { LeagueRosterSummary } from './types'
import { sleeperGet } from './sleeperApi'

// Client-side read of "who's in each league" for a season that exists on Sleeper but hasn't been
// played/backfilled yet (see src/data/liveSleeper.ts for why the live path sits outside
// LeagueDataProvider). One request per tier, rosters only — no games, so it works from the moment
// the commissioner creates the leagues.

interface SleeperRosterOwner {
  roster_id: number
  owner_id: string | null
}

/**
 * One tier's signed-up franchises. A roster whose owner isn't in `members.ts` yet is counted as
 * claimed but omitted from `memberIds` (warned, not thrown) — the same forgiving treatment
 * fetchRosterMap gives, so a brand-new manager can't blank the section.
 */
export async function fetchLeagueRoster(tier: Tier, year: string, leagueId: string): Promise<LeagueRosterSummary> {
  const rosters = await sleeperGet<SleeperRosterOwner[]>(`/league/${leagueId}/rosters`)
  if (!Array.isArray(rosters)) throw new Error(`Sleeper league/${leagueId}/rosters: not an array`)

  const seen = new Set<string>()
  const memberIds: string[] = []
  let claimed = 0
  for (const r of rosters) {
    if (!r.owner_id) continue // an open slot the commissioner hasn't filled
    claimed++
    const member = memberBySleeperId(String(r.owner_id))
    if (!member) {
      console.warn(`[liveRosters] ${tier} roster ${r.roster_id} (owner ${r.owner_id}) has no matching Member yet`)
      continue
    }
    // Co-owned franchises have two Sleeper accounts on one ffuId; never list the franchise twice.
    if (seen.has(member.ffuId)) continue
    seen.add(member.ffuId)
    memberIds.push(member.ffuId)
  }
  return { tier, year, leagueId, memberIds, claimed, totalRosters: rosters.length }
}

/** Every configured tier for `year`, fetched in parallel; tier order follows `leagueIds`. */
export async function fetchLeagueRosters(year: string, leagueIds: Partial<Record<Tier, string>>): Promise<LeagueRosterSummary[]> {
  const entries = Object.entries(leagueIds) as [Tier, string][]
  return Promise.all(entries.map(([tier, leagueId]) => fetchLeagueRoster(tier, year, leagueId)))
}
