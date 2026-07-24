import type { DraftData, DraftPick, SeasonData } from '@/data'
import type { Tier } from '@/config/types'
import { teamsBySlot } from './draft'
import { seasonUpr } from './upr'

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
  /** Unified Power Rating for that team-season (regular-season strength); null if unavailable. */
  upr: number | null
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
  /** Mean final placement (lower is better). */
  avgFinish: number
  /** Median final placement (lower is better). */
  medianFinish: number
  /** Mean Unified Power Rating across the build's team-seasons; null if none have a UPR. */
  avgUpr: number | null
  /** Finished 1st (champions). */
  first: Bracket
  /** Finished in the top 3 (by final placement). */
  top3: Bracket
  /** Finished in the top 6 (by final placement). */
  top6: Bracket
  /** Finished in the top 9 (by final placement). */
  top9: Bracket
  /** The individual team-seasons in this bucket (year desc, then tier order). */
  instances: BuildInstance[]
}

/** Sample-wide anchors each build is read against: bracket shares + average finish + average UPR. */
export interface BuildBaselines {
  first: number
  top3: number
  top6: number
  top9: number
  /** Pooled mean final placement (≈ 6.5 in a 12-team league). */
  finish: number
  /** Pooled mean UPR across the sample. */
  upr: number
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

/** Placement cutoff for each finish bracket (≤ cutoff). Shared by the per-build counts + baselines. */
const BRACKET_CUTOFF = { first: 1, top3: 3, top6: 6, top9: 9 } as const

const mean = (xs: number[]): number => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Median of an already-ascending list (0 when empty). */
function median(sorted: number[]): number {
  const n = sorted.length
  if (n === 0) return 0
  const mid = n >> 1
  return n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** Finalize one aggregated bucket into a BuildStat (finish stats, UPR, brackets, sorted instances). */
function toBuildStat(key: string, counts: Record<string, number>, instances: BuildInstance[], selected: readonly string[]): BuildStat {
  const teams = instances.length
  const bracket = (pred: (i: BuildInstance) => boolean): Bracket => {
    const count = instances.filter(pred).length
    return { count, pct: teams > 0 ? count / teams : 0 }
  }
  const placements = instances.map((i) => i.finalPlacement).sort((a, b) => a - b)
  const uprs = instances.map((i) => i.upr).filter((u): u is number => u !== null)
  instances.sort((a, b) => Number(b.year) - Number(a.year) || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
  return {
    key,
    counts,
    label: buildLabel(counts) || emptyLabel(selected),
    size: Object.values(counts).reduce((a, b) => a + b, 0),
    teams,
    avgFinish: mean(placements),
    medianFinish: median(placements),
    avgUpr: uprs.length > 0 ? mean(uprs) : null,
    first: bracket((i) => i.finalPlacement <= BRACKET_CUTOFF.first),
    top3: bracket((i) => i.finalPlacement <= BRACKET_CUTOFF.top3),
    top6: bracket((i) => i.finalPlacement <= BRACKET_CUTOFF.top6),
    top9: bracket((i) => i.finalPlacement <= BRACKET_CUTOFF.top9),
    instances,
  }
}

type BuildBucket = { counts: Record<string, number>; instances: BuildInstance[] }

interface Filters {
  members: Set<string> | undefined
  /** Draft slots (1..N) to keep; undefined = all. */
  slots: Set<number> | undefined
}

/** memberId → the draft slot (draft-order position) that team picked from. */
function slotByMember(draft: DraftData): Map<string, number> {
  const out = new Map<string, number>()
  for (const [slot, memberId] of teamsBySlot(draft)) out.set(memberId, slot)
  return out
}

/** Whether a team-season passes the member + draft-slot filters and has a recorded finish. */
function keepTeam(place: number | undefined, memberId: string, slot: number | undefined, f: Filters): boolean {
  if (place === undefined) return false
  if (f.members && !f.members.has(memberId)) return false
  if (f.slots && (slot === undefined || !f.slots.has(slot))) return false
  return true
}

/** Fold every (completed-season) team's build into buckets; returns the aggregate + team total. */
function accumulateBuilds(
  drafts: DraftData[],
  placements: Map<string, Map<string, number>>,
  seasonSizes: Map<string, number>,
  uprBySeason: Map<string, Map<string, number>>,
  threshold: number,
  positions: Set<string>,
  filters: Filters,
): { agg: Map<string, BuildBucket>; totalTeams: number } {
  const agg = new Map<string, BuildBucket>()
  let totalTeams = 0
  for (const draft of drafts) {
    const key = `${draft.year}|${draft.tier}`
    const finish = placements.get(key)
    if (finish === undefined) continue // no placements recorded → unfinished season, skip
    const seasonSize = seasonSizes.get(key) ?? finish.size
    const slotOf = slotByMember(draft)
    const uprOf = uprBySeason.get(key)
    for (const [memberId, picks] of firstNPicksByTeam(draft, threshold)) {
      const place = finish.get(memberId)
      if (!keepTeam(place, memberId, slotOf.get(memberId), filters)) continue
      const counts = countsFor(picks, positions)
      const bucketKey = buildKey(counts) || EMPTY_KEY
      let entry = agg.get(bucketKey)
      if (entry === undefined) {
        entry = { counts, instances: [] }
        agg.set(bucketKey, entry)
      }
      entry.instances.push({ year: draft.year, tier: draft.tier, memberId, finalPlacement: place!, seasonSize, upr: uprOf?.get(memberId) ?? null, picks })
      totalTeams += 1
    }
  }
  return { agg, totalTeams }
}

const toSet = <T>(xs: readonly T[] | undefined): Set<T> | undefined => (xs && xs.length > 0 ? new Set(xs) : undefined)

/**
 * Aggregate first-N-round builds across every draft and report their finish brackets (1st / top-3 /
 * top-6 / top-9). `selected` restricts which positions count toward a build (default: all skill
 * positions); `memberIds`, when non-empty, restricts the whole sample to those franchises; `slots`,
 * when non-empty, keeps only teams that drafted from those draft-order positions. Unfinished seasons
 * (no recorded placements) are excluded so a live/incomplete season never dilutes the rates. Both
 * `drafts` and `seasons` should already be scoped (e.g. to a single tier) by the caller.
 */
export function analyzeBuilds(
  drafts: DraftData[],
  seasons: SeasonData[],
  threshold: number,
  selected: readonly string[] = FILTER_POSITIONS,
  memberIds?: readonly string[],
  slots?: readonly number[],
): BuildAnalysis {
  const positions = new Set(selected)
  const filters: Filters = { members: toSet(memberIds), slots: toSet(slots) }
  const placements = placementBySeason(seasons)
  const seasonSizes = new Map(seasons.map((s) => [`${s.year}|${s.tier}`, s.teams.length]))
  const uprBySeason = new Map(seasons.map((s) => [`${s.year}|${s.tier}`, seasonUpr(s)] as const))
  const { agg, totalTeams } = accumulateBuilds(drafts, placements, seasonSizes, uprBySeason, threshold, positions, filters)

  const builds = [...agg.entries()].map(([key, e]) => toBuildStat(key, e.counts, e.instances, selected))
  return { threshold, totalTeams, baselines: computeBaselines(builds, totalTeams), builds }
}

/**
 * The anchors each build's cell is colored against. The finish brackets + average finish use the
 * STRUCTURAL rate — the share expected by chance from the season structure (top-K = K/size; average
 * finish = (size+1)/2). Deliberately NOT the sample average, so a Team or Draft-slot filter (which
 * selects for stronger/weaker teams) doesn't drag the "by chance" line off 25/50/75/8%. UPR has no
 * structural anchor, so it stays the pooled mean of the current scope.
 */
function computeBaselines(builds: BuildStat[], totalTeams: number): BuildBaselines {
  let invSize = 0 // Σ 1/seasonSize → structural top-K = K · mean(1/size)
  let finish = 0 // Σ (size+1)/2 → structural average finish
  const uprs: number[] = []
  for (const b of builds) {
    for (const i of b.instances) {
      invSize += 1 / i.seasonSize
      finish += (i.seasonSize + 1) / 2
      if (i.upr !== null) uprs.push(i.upr)
    }
  }
  const perTeam = totalTeams > 0 ? invSize / totalTeams : 0
  return {
    first: BRACKET_CUTOFF.first * perTeam,
    top3: BRACKET_CUTOFF.top3 * perTeam,
    top6: BRACKET_CUTOFF.top6 * perTeam,
    top9: BRACKET_CUTOFF.top9 * perTeam,
    finish: totalTeams > 0 ? finish / totalTeams : 0,
    upr: mean(uprs),
  }
}
