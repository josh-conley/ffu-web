// Public API of the config layer. Identity + season-registry lookups over the (regenerable)
// MEMBERS/SEASONS data. Platform IDs stay inside this layer: `memberBySleeperId` is the only
// place that translates a platform account, and it exists for the provider/migration alone.

import type { Member, SeasonMeta, Tier } from './types'
import { MEMBERS } from './members'
import { SEASONS } from './seasons'

const TIER_ORDER: Record<Tier, number> = { PREMIER: 0, MASTERS: 1, NATIONAL: 2 }

const byFfuId = new Map<string, Member>(MEMBERS.map((m) => [m.ffuId, m]))
const bySleeper = new Map<string, Member>()
for (const m of MEMBERS) {
  for (const id of m.platformIds.sleeper ?? []) bySleeper.set(id, m)
}

export function getMember(ffuId: string): Member | undefined {
  return byFfuId.get(ffuId)
}

/** The team name used in a given season (historical override, else current name). */
export function nameForYear(ffuId: string, year: string): string | undefined {
  const member = byFfuId.get(ffuId)
  return member?.historicalNames?.[year] ?? member?.name
}

/** Provider/migration use only — resolve a Sleeper account id to its franchise. */
export function memberBySleeperId(sleeperId: string): Member | undefined {
  return bySleeper.get(sleeperId)
}

export function getSeasonMeta(tier: Tier, year: string): SeasonMeta | undefined {
  return SEASONS.find((s) => s.tier === tier && s.year === year)
}

/** Tiers that existed in a year, in promotion/relegation order. */
export function tiersForYear(year: string): Tier[] {
  return SEASONS.filter((s) => s.year === year)
    .map((s) => s.tier)
    .sort((a, b) => TIER_ORDER[a] - TIER_ORDER[b])
}

export { MEMBERS, SEASONS }
export type { Member, Owner, SeasonMeta, Tier, Era, OwnerRole, MemberOwner } from './types'
export { seasonLength, playoffWeeks, regularSeasonWeeks, isPlayoffWeek } from './eras'
