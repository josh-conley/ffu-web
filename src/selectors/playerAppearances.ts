import type { Tier } from '@/config'
import type { PlayerMap, SeasonData, SeasonLineups } from '@/data'

// NFL players through FFU's eyes: every week a player sat on an FFU roster, flattened out of the
// lineup files. Lineups exist for the Sleeper era only (2021 on), so everything built on this is too.
// Derived on demand, never stored.

export interface PlayerAppearance {
  playerId: string
  year: string
  tier: Tier
  week: number
  memberId: string
  points: number
  /** In the starting lineup (the points counted), rather than on the bench. */
  started: boolean
  /** The team-week was a playoff game. */
  isPlayoff: boolean
}

/** Every player's name + position, falling back to the raw id for anyone the map doesn't know. */
export function playerRef(players: PlayerMap, playerId: string): { name: string; position: string } {
  const ref = players[playerId]
  return { name: ref?.name ?? playerId, position: ref?.position ?? '?' }
}

const seasonKey = (tier: Tier, year: string) => `${tier}:${year}`

/** `week:memberId` for every playoff team-week, per season — so a lineup week can say what it was. */
function playoffTeamWeeks(seasons: SeasonData[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const s of seasons) {
    const weeks = new Set<string>()
    for (const g of s.games) {
      if (!g.isPlayoff) continue
      for (const p of g.participants) weeks.add(`${g.week}:${p.memberId}`)
    }
    out.set(seasonKey(s.tier, s.year), weeks)
  }
  return out
}

/** Flattens every lineup file into one row per player per team-week (starters and bench). */
export function playerAppearances(lineups: SeasonLineups[], seasons: SeasonData[]): PlayerAppearance[] {
  const playoffs = playoffTeamWeeks(seasons)
  const out: PlayerAppearance[] = []
  for (const season of lineups) {
    const playoffWeeks = playoffs.get(seasonKey(season.tier, season.year))
    for (const wk of season.weeks) {
      for (const team of wk.teams) {
        const base = {
          year: season.year,
          tier: season.tier,
          week: wk.week,
          memberId: team.memberId,
          isPlayoff: playoffWeeks?.has(`${wk.week}:${team.memberId}`) ?? false,
        }
        for (const p of team.starters) out.push({ ...base, playerId: p.playerId, points: p.points, started: true })
        for (const p of team.bench) out.push({ ...base, playerId: p.playerId, points: p.points, started: false })
      }
    }
  }
  return out
}

export interface PlayerSummary {
  playerId: string
  name: string
  position: string
  /** Weeks he was in a starting lineup. */
  starts: number
  /** Points scored while started — the points that counted for an FFU team. */
  points: number
  /** Points per start (0 when never started). */
  avg: number
  /** His best started week. */
  best: number
  /** Weeks on any FFU roster, started or benched. */
  rosteredWeeks: number
  /** Distinct members who STARTED him at least once. */
  managers: number
  /** Distinct seasons he was on an FFU roster. */
  seasons: number
}

interface Tally {
  starts: number
  points: number
  best: number
  rosteredWeeks: number
  managers: Set<string>
  seasons: Set<string>
}

const round2 = (n: number) => Math.round(n * 100) / 100

function tally(appearances: PlayerAppearance[]): Map<string, Tally> {
  const byPlayer = new Map<string, Tally>()
  for (const a of appearances) {
    let t = byPlayer.get(a.playerId)
    if (!t) {
      t = { starts: 0, points: 0, best: 0, rosteredWeeks: 0, managers: new Set(), seasons: new Set() }
      byPlayer.set(a.playerId, t)
    }
    t.rosteredWeeks++
    t.seasons.add(a.year)
    if (!a.started) continue
    t.starts++
    t.points += a.points
    t.best = Math.max(t.best, a.points)
    t.managers.add(a.memberId)
  }
  return byPlayer
}

/** One row per player who was ever on an FFU roster, most FFU points first. */
export function playerSummaries(appearances: PlayerAppearance[], players: PlayerMap): PlayerSummary[] {
  return [...tally(appearances)]
    .map(([playerId, t]) => ({
      playerId,
      ...playerRef(players, playerId),
      starts: t.starts,
      points: round2(t.points),
      avg: t.starts > 0 ? round2(t.points / t.starts) : 0,
      best: round2(t.best),
      rosteredWeeks: t.rosteredWeeks,
      managers: t.managers.size,
      seasons: t.seasons.size,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
}
