import type { DraftData, DraftPick, SeasonData } from '@/data'
import type { Tier } from '@/config/types'

// Roster-construction analysis (the /draft-analysis page). A team's "build" is the position
// composition of the picks it MADE in rounds 1..threshold (traded picks belong to whoever made
// them — that's the real roster shape), counted over only the SELECTED positions. We aggregate
// identical builds across every completed tier-season and report how often each reached the
// championship bracket. Pure + tested; the page only composes. Playoff = reached the championship
// bracket (top 6 of 12 — a 50% baseline).

/** Canonical position order for stable build keys/labels; anything unknown sorts after, alpha. */
export const BUILD_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const
export type BuildPosition = (typeof BUILD_POSITIONS)[number]

/** The positions a user can filter a build by (K/DEF are almost never drafted early — omitted). */
export const FILTER_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const

/** Bucket key for a team with none of the selected positions in its first-N picks. */
const EMPTY_KEY = '∅'

/** Positions present in a build, canonical order (known first, then any extras alphabetically). */
export function orderedPositions(counts: Record<string, number>): string[] {
  const known = BUILD_POSITIONS.filter((p) => counts[p])
  const extra = Object.keys(counts)
    .filter((p) => counts[p] && !BUILD_POSITIONS.includes(p as BuildPosition))
    .sort()
  return [...known, ...extra]
}

/** Stable identity for a build, e.g. `{RB:2, WR:1}` → "RB2-WR1". Empty for a no-selected-picks build. */
export function buildKey(counts: Record<string, number>): string {
  return orderedPositions(counts)
    .map((p) => `${p}${counts[p]}`)
    .join('-')
}

/** Human label, e.g. `{RB:2, WR:1}` → "2 RB · 1 WR". */
export function buildLabel(counts: Record<string, number>): string {
  return orderedPositions(counts)
    .map((p) => `${counts[p]} ${p}`)
    .join(' · ')
}

/** Label for the "none of the selected positions" bucket, e.g. selecting RB+WR → "0 RB · 0 WR". */
function emptyLabel(selected: readonly string[]): string {
  const set = new Set(selected)
  return BUILD_POSITIONS.filter((p) => set.has(p)).map((p) => `0 ${p}`).join(' · ')
}

/** Each team's picks in rounds 1..threshold, in draft order. */
function firstNPicksByTeam(draft: DraftData, threshold: number): Map<string, DraftPick[]> {
  const byTeam = new Map<string, DraftPick[]>()
  for (const pick of draft.picks) {
    if (pick.round > threshold) continue
    const arr = byTeam.get(pick.memberId) ?? []
    arr.push(pick)
    byTeam.set(pick.memberId, arr)
  }
  for (const arr of byTeam.values()) arr.sort((a, b) => a.overall - b.overall)
  return byTeam
}

/** Count a team's picks by position, restricted to the selected positions (others ignored). */
function countsFor(picks: DraftPick[], selected: Set<string>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const pick of picks) {
    const pos = pick.player.position
    if (selected.has(pos)) counts[pos] = (counts[pos] ?? 0) + 1
  }
  return counts
}

/**
 * Each team's position counts among the picks it made in rounds 1..threshold, restricted to the
 * selected positions. Unselected positions are dropped, so narrowing the selection merges builds
 * (e.g. selecting only RB collapses "2 RB · 1 WR" and "2 RB · 1 TE" into one "2 RB" bucket).
 */
export function teamBuilds(
  draft: DraftData,
  threshold: number,
  selected: readonly string[] = FILTER_POSITIONS,
): Map<string, Record<string, number>> {
  const set = new Set(selected)
  const builds = new Map<string, Record<string, number>>()
  for (const [memberId, picks] of firstNPicksByTeam(draft, threshold)) {
    builds.set(memberId, countsFor(picks, set))
  }
  return builds
}

/** `${year}|${tier}` → members who reached the championship bracket that season. */
function playoffBySeason(seasons: SeasonData[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const s of seasons) {
    const set = new Set<string>()
    for (const g of s.games) {
      if (g.bracket !== 'championship') continue
      for (const p of g.participants) set.add(p.memberId)
    }
    map.set(`${s.year}|${s.tier}`, set)
  }
  return map
}

/** One team-season that drafted a given build — the drill-down row behind each aggregate. */
export interface BuildInstance {
  year: string
  tier: Tier
  memberId: string
  madePlayoffs: boolean
  /** The team's picks in rounds 1..threshold, in draft order (all positions — the actual roster). */
  picks: DraftPick[]
}

export interface BuildStat {
  /** Stable key (also the row identity). */
  key: string
  counts: Record<string, number>
  label: string
  /** How many picks the build spans over the selected positions. */
  size: number
  /** Team-seasons that drafted this build. */
  teams: number
  /** Of those, how many reached the championship bracket. */
  playoffTeams: number
  /** playoffTeams / teams (0..1). */
  playoffPct: number
  /** Percentage points above/below the sample baseline (signed) — the build's "edge". */
  edge: number
  /** The individual team-seasons in this bucket (year desc, then tier order). */
  instances: BuildInstance[]
}

export interface BuildAnalysis {
  threshold: number
  /** Total team-seasons in the sample (completed seasons only). */
  totalTeams: number
  playoffTeams: number
  /** Overall playoff rate across the sample (~0.5 with 6-of-12) — the anchor each build is read against. */
  baselinePct: number
  builds: BuildStat[]
}

const TIER_ORDER: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

/** Finalize one aggregated bucket into a BuildStat (rates, edge, sorted instances). */
function toBuildStat(key: string, counts: Record<string, number>, instances: BuildInstance[], baselinePct: number, selected: readonly string[]): BuildStat {
  const teams = instances.length
  const playoffTeams = instances.filter((i) => i.madePlayoffs).length
  const playoffPct = teams > 0 ? playoffTeams / teams : 0
  instances.sort((a, b) => Number(b.year) - Number(a.year) || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
  return {
    key,
    counts,
    label: buildLabel(counts) || emptyLabel(selected),
    size: Object.values(counts).reduce((a, b) => a + b, 0),
    teams,
    playoffTeams,
    playoffPct,
    edge: (playoffPct - baselinePct) * 100,
    instances,
  }
}

/**
 * Aggregate first-N-round builds across every draft and report playoff rates. `selected` restricts
 * which positions count toward a build (default: all skill positions); `memberIds`, when non-empty,
 * restricts the whole sample (and its baseline) to those franchises. Unfinished seasons (no
 * championship bracket recorded yet) are excluded so a live/incomplete season never dilutes the
 * rates. `seasons` supplies the playoff outcomes; `drafts` the picks — both should already be scoped
 * (e.g. to a single tier) by the caller.
 */
type BuildBucket = { counts: Record<string, number>; instances: BuildInstance[] }

/** Fold every (completed-season) team's build into buckets; returns the aggregate + sample totals. */
function accumulateBuilds(
  drafts: DraftData[],
  playoffs: Map<string, Set<string>>,
  threshold: number,
  positions: Set<string>,
  memberFilter: Set<string> | undefined,
): { agg: Map<string, BuildBucket>; totalTeams: number; totalPlayoff: number } {
  const agg = new Map<string, BuildBucket>()
  let totalTeams = 0
  let totalPlayoff = 0
  for (const draft of drafts) {
    const made = playoffs.get(`${draft.year}|${draft.tier}`)
    if (!made || made.size === 0) continue // no playoffs recorded → unfinished season, skip
    for (const [memberId, picks] of firstNPicksByTeam(draft, threshold)) {
      if (memberFilter && !memberFilter.has(memberId)) continue
      const counts = countsFor(picks, positions)
      const key = buildKey(counts) || EMPTY_KEY
      let entry = agg.get(key)
      if (entry === undefined) {
        entry = { counts, instances: [] }
        agg.set(key, entry)
      }
      const madePlayoffs = made.has(memberId)
      entry.instances.push({ year: draft.year, tier: draft.tier, memberId, madePlayoffs, picks })
      totalTeams += 1
      if (madePlayoffs) totalPlayoff += 1
    }
  }
  return { agg, totalTeams, totalPlayoff }
}

export function analyzeBuilds(
  drafts: DraftData[],
  seasons: SeasonData[],
  threshold: number,
  selected: readonly string[] = FILTER_POSITIONS,
  memberIds?: readonly string[],
): BuildAnalysis {
  const positions = new Set(selected)
  const memberFilter = memberIds && memberIds.length > 0 ? new Set(memberIds) : undefined
  const { agg, totalTeams, totalPlayoff } = accumulateBuilds(drafts, playoffBySeason(seasons), threshold, positions, memberFilter)
  const baselinePct = totalTeams > 0 ? totalPlayoff / totalTeams : 0
  const builds = [...agg.entries()].map(([key, e]) => toBuildStat(key, e.counts, e.instances, baselinePct, selected))
  return { threshold, totalTeams, playoffTeams: totalPlayoff, baselinePct, builds }
}
