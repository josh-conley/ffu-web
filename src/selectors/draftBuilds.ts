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

/**
 * `${year}|${tier}` → each member's final placement. Only FINISHED seasons are included (a season
 * with no recorded placements is still in progress and must not count teams as failures). Finish
 * brackets (1st / top-3 / top-6 / bottom-3) are then derived per build from these placements.
 */
function placementBySeason(seasons: SeasonData[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>()
  for (const s of seasons) {
    const placements = new Map<string, number>()
    for (const t of s.teams) if (t.finalPlacement !== undefined) placements.set(t.memberId, t.finalPlacement)
    if (placements.size > 0) map.set(`${s.year}|${s.tier}`, placements)
  }
  return map
}

/** One team-season that drafted a given build — the drill-down row behind each aggregate. */
export interface BuildInstance {
  year: string
  tier: Tier
  memberId: string
  /** Final placement (1 = champion, seasonSize = last). Always set — unfinished seasons are excluded. */
  finalPlacement: number
  /** Teams in that tier-season (so "last place" = finalPlacement === seasonSize). */
  seasonSize: number
  /** The team's picks in rounds 1..threshold, in draft order (all positions — the actual roster). */
  picks: DraftPick[]
}

/** A finish bracket: how many of the build's team-seasons landed in it, and the share (0..1). */
export interface Bracket {
  count: number
  pct: number
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
  /** Finished 1st (champions). */
  first: Bracket
  /** Finished in the top 3 (by final placement). */
  top3: Bracket
  /** Finished in the top 6 (by final placement). */
  top6: Bracket
  /** Finished in the bottom 3 (last three placements). */
  bottom3: Bracket
  /** The individual team-seasons in this bucket (year desc, then tier order). */
  instances: BuildInstance[]
}

/** Sample-wide share landing in each bracket — the "expected by chance" line (≈ 1/12, 3/12, 6/12, 3/12). */
export interface BuildBaselines {
  first: number
  top3: number
  top6: number
  bottom3: number
}

export interface BuildAnalysis {
  threshold: number
  /** Total team-seasons in the sample (completed seasons only). */
  totalTeams: number
  /** Overall bracket rates across the whole sample — each build is read against these. */
  baselines: BuildBaselines
  builds: BuildStat[]
}

const TIER_ORDER: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

/** A team is in the "bottom 3" when its placement is within the last three of its season. */
export function isBottom3(inst: BuildInstance): boolean {
  return inst.finalPlacement >= inst.seasonSize - 2
}

/** Finalize one aggregated bucket into a BuildStat (finish brackets + sorted instances). */
function toBuildStat(key: string, counts: Record<string, number>, instances: BuildInstance[], selected: readonly string[]): BuildStat {
  const teams = instances.length
  const bracket = (pred: (i: BuildInstance) => boolean): Bracket => {
    const count = instances.filter(pred).length
    return { count, pct: teams > 0 ? count / teams : 0 }
  }
  instances.sort((a, b) => Number(b.year) - Number(a.year) || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
  return {
    key,
    counts,
    label: buildLabel(counts) || emptyLabel(selected),
    size: Object.values(counts).reduce((a, b) => a + b, 0),
    teams,
    first: bracket((i) => i.finalPlacement === 1),
    top3: bracket((i) => i.finalPlacement <= 3),
    top6: bracket((i) => i.finalPlacement <= 6),
    bottom3: bracket(isBottom3),
    instances,
  }
}

type BuildBucket = { counts: Record<string, number>; instances: BuildInstance[] }

/** Fold every (completed-season) team's build into buckets; returns the aggregate + team total. */
function accumulateBuilds(
  drafts: DraftData[],
  placements: Map<string, Map<string, number>>,
  seasonSizes: Map<string, number>,
  threshold: number,
  positions: Set<string>,
  memberFilter: Set<string> | undefined,
): { agg: Map<string, BuildBucket>; totalTeams: number } {
  const agg = new Map<string, BuildBucket>()
  let totalTeams = 0
  for (const draft of drafts) {
    const key = `${draft.year}|${draft.tier}`
    const finish = placements.get(key)
    if (finish === undefined) continue // no placements recorded → unfinished season, skip
    const seasonSize = seasonSizes.get(key) ?? finish.size
    for (const [memberId, picks] of firstNPicksByTeam(draft, threshold)) {
      const place = finish.get(memberId)
      if (place === undefined || (memberFilter && !memberFilter.has(memberId))) continue
      const counts = countsFor(picks, positions)
      const bucketKey = buildKey(counts) || EMPTY_KEY
      let entry = agg.get(bucketKey)
      if (entry === undefined) {
        entry = { counts, instances: [] }
        agg.set(bucketKey, entry)
      }
      entry.instances.push({ year: draft.year, tier: draft.tier, memberId, finalPlacement: place, seasonSize, picks })
      totalTeams += 1
    }
  }
  return { agg, totalTeams }
}

/**
 * Aggregate first-N-round builds across every draft and report their finish brackets (1st / top-3 /
 * top-6 / bottom-3). `selected` restricts which positions count toward a build (default: all skill
 * positions); `memberIds`, when non-empty, restricts the whole sample to those franchises. Unfinished
 * seasons (no recorded placements) are excluded so a live/incomplete season never dilutes the rates.
 * Both `drafts` and `seasons` should already be scoped (e.g. to a single tier) by the caller.
 */
export function analyzeBuilds(
  drafts: DraftData[],
  seasons: SeasonData[],
  threshold: number,
  selected: readonly string[] = FILTER_POSITIONS,
  memberIds?: readonly string[],
): BuildAnalysis {
  const positions = new Set(selected)
  const memberFilter = memberIds && memberIds.length > 0 ? new Set(memberIds) : undefined
  const placements = placementBySeason(seasons)
  const seasonSizes = new Map(seasons.map((s) => [`${s.year}|${s.tier}`, s.teams.length]))
  const { agg, totalTeams } = accumulateBuilds(drafts, placements, seasonSizes, threshold, positions, memberFilter)

  const builds = [...agg.entries()].map(([key, e]) => toBuildStat(key, e.counts, e.instances, selected))
  return { threshold, totalTeams, baselines: bracketBaselines(builds, totalTeams), builds }
}

/** Pooled bracket rates across every build — the baseline each build's cell is colored against. */
function bracketBaselines(builds: BuildStat[], totalTeams: number): BuildBaselines {
  const share = (n: number) => (totalTeams > 0 ? n / totalTeams : 0)
  let first = 0
  let top3 = 0
  let top6 = 0
  let bottom3 = 0
  for (const b of builds) {
    first += b.first.count
    top3 += b.top3.count
    top6 += b.top6.count
    bottom3 += b.bottom3.count
  }
  return { first: share(first), top3: share(top3), top6: share(top6), bottom3: share(bottom3) }
}
