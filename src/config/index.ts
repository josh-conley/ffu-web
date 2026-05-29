// Public API of the config layer. Identity + season-registry lookups over the (regenerable)
// MEMBERS/SEASONS data. Platform IDs stay inside this layer: `memberBySleeperId` is the only
// place that translates a platform account, and it exists for the provider/migration alone.

import type { Member, Owner, SeasonMeta, Tier } from './types'
import { MEMBERS } from './members'
import { SEASONS } from './seasons'
import { OWNERS } from './owners'

const TIER_ORDER: Record<Tier, number> = { PREMIER: 0, MASTERS: 1, NATIONAL: 2 }

const byFfuId = new Map<string, Member>(MEMBERS.map((m) => [m.ffuId, m]))
const ownersById = new Map<string, Owner>(OWNERS.map((o) => [o.id, o]))
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

export function getOwner(ownerId: string): Owner | undefined {
  return ownersById.get(ownerId)
}

/** Display form for an owner, e.g. "Josh C." */
export function formatOwner(owner: Owner): string {
  return `${owner.firstName} ${owner.lastInitial}.`
}

/** Display names of a member's owners (primary first), e.g. ["Josh C."]. Empty if unknown yet. */
export function ownerNames(ffuId: string): string[] {
  const member = byFfuId.get(ffuId)
  if (member === undefined) return []
  return [...member.owners]
    .sort((a, b) => (a.role === 'primary' ? -1 : 0) - (b.role === 'primary' ? -1 : 0))
    .map((o) => ownersById.get(o.ownerId))
    .filter((o): o is Owner => o !== undefined)
    .map(formatOwner)
}

export { MEMBERS, SEASONS, OWNERS }
export type { Member, Owner, SeasonMeta, Tier, Era, OwnerRole, MemberOwner } from './types'
export { seasonLength, playoffWeeks, regularSeasonWeeks, isPlayoffWeek } from './eras'
