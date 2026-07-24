import type { DraftData, SeasonData } from '@/data'

// Roster-construction analysis (the /draft-analysis page). A team's "build" is the position
// composition of the picks it MADE in rounds 1..threshold (traded picks belong to whoever made
// them — that's the real roster shape). We aggregate identical builds across every completed
// tier-season and report how often each reached the championship bracket. Pure + tested; the page
// only composes. Playoff = reached the championship bracket (top 6 of 12 — a 50% baseline).

/** Canonical position order for stable build keys/labels; anything unknown sorts after, alpha. */
export const BUILD_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const
export type BuildPosition = (typeof BUILD_POSITIONS)[number]

/** Positions present in a build, canonical order (known first, then any extras alphabetically). */
export function orderedPositions(counts: Record<string, number>): string[] {
  const known = BUILD_POSITIONS.filter((p) => counts[p])
  const extra = Object.keys(counts)
    .filter((p) => counts[p] && !BUILD_POSITIONS.includes(p as BuildPosition))
    .sort()
  return [...known, ...extra]
}

/** Stable identity for a build, e.g. `{RB:2, WR:1}` → "RB2-WR1". */
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

/** Each team's position counts among the picks it made in rounds 1..threshold. */
export function teamBuilds(draft: DraftData, threshold: number): Map<string, Record<string, number>> {
  const builds = new Map<string, Record<string, number>>()
  for (const pick of draft.picks) {
    if (pick.round > threshold) continue
    const counts = builds.get(pick.memberId) ?? {}
    counts[pick.player.position] = (counts[pick.player.position] ?? 0) + 1
    builds.set(pick.memberId, counts)
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

export interface BuildStat {
  /** Stable key (also the row identity). */
  key: string
  counts: Record<string, number>
  label: string
  /** How many picks the build spans (== threshold except where picks were traded). */
  size: number
  /** Team-seasons that drafted this build. */
  teams: number
  /** Of those, how many reached the championship bracket. */
  playoffTeams: number
  /** playoffTeams / teams (0..1). */
  playoffPct: number
  /** Percentage points above/below the sample baseline (signed) — the build's "edge". */
  edge: number
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

/**
 * Aggregate first-N-round builds across every draft and report playoff rates. Unfinished seasons
 * (no championship bracket recorded yet) are excluded so a live/incomplete season never dilutes the
 * rates. `seasons` supplies the playoff outcomes; `drafts` the picks — both should already be scoped
 * (e.g. to a single tier) by the caller.
 */
export function analyzeBuilds(drafts: DraftData[], seasons: SeasonData[], threshold: number): BuildAnalysis {
  const playoffs = playoffBySeason(seasons)
  const agg = new Map<string, { counts: Record<string, number>; teams: number; playoffTeams: number }>()
  let totalTeams = 0
  let totalPlayoff = 0

  for (const draft of drafts) {
    const made = playoffs.get(`${draft.year}|${draft.tier}`)
    if (!made || made.size === 0) continue // no playoffs recorded → unfinished season, skip
    for (const [memberId, counts] of teamBuilds(draft, threshold)) {
      const key = buildKey(counts)
      let entry = agg.get(key)
      if (entry === undefined) {
        entry = { counts, teams: 0, playoffTeams: 0 }
        agg.set(key, entry)
      }
      entry.teams += 1
      totalTeams += 1
      if (made.has(memberId)) {
        entry.playoffTeams += 1
        totalPlayoff += 1
      }
    }
  }

  const baselinePct = totalTeams > 0 ? totalPlayoff / totalTeams : 0
  const builds: BuildStat[] = [...agg.entries()].map(([key, e]) => {
    const playoffPct = e.teams > 0 ? e.playoffTeams / e.teams : 0
    return {
      key,
      counts: e.counts,
      label: buildLabel(e.counts),
      size: Object.values(e.counts).reduce((a, b) => a + b, 0),
      teams: e.teams,
      playoffTeams: e.playoffTeams,
      playoffPct,
      edge: (playoffPct - baselinePct) * 100,
    }
  })

  return { threshold, totalTeams, playoffTeams: totalPlayoff, baselinePct, builds }
}
