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
  /** The team-week was a playoff game (any bracket, consolation and placement games included). */
  isPlayoff: boolean
  /** The team-week was a championship-bracket playoff game — the playoffs proper. */
  championshipBracket: boolean
  /** The team-week was its league's championship final — and how it went. Absent otherwise. */
  titleGame?: 'won' | 'lost'
}

/** Every player's name + position, falling back to the raw id for anyone the map doesn't know. */
export function playerRef(players: PlayerMap, playerId: string): { name: string; position: string } {
  const ref = players[playerId]
  return { name: ref?.name ?? playerId, position: ref?.position ?? '?' }
}

const seasonKey = (tier: Tier, year: string) => `${tier}:${year}`

interface SeasonWeeks {
  /** `week:memberId` for every playoff team-week. */
  playoff: Set<string>
  /** `week:memberId` for every championship-bracket team-week. */
  bracket: Set<string>
  /** `week:memberId` of the championship final's two sides → how each came out. */
  final: Map<string, 'won' | 'lost'>
}

/**
 * The championship final: the champion's last championship-bracket game. Only a DECIDED season has
 * one, so a season still being played never mistakes a semifinal for the final.
 */
function championshipFinal(season: SeasonData) {
  const champ = season.teams.find((t) => t.finalPlacement === 1)?.memberId
  if (!champ) return undefined
  const games = season.games.filter((g) => g.isPlayoff && g.bracket === 'championship' && g.participants.some((p) => p.memberId === champ))
  const final = games.reduce<(typeof games)[number] | undefined>((best, g) => (!best || g.week > best.week ? g : best), undefined)
  return final && { champ, game: final }
}

/** Per season, which team-weeks were playoff games and which were the title game. */
function seasonWeeks(seasons: SeasonData[]): Map<string, SeasonWeeks> {
  const out = new Map<string, SeasonWeeks>()
  for (const s of seasons) {
    const playoff = new Set<string>()
    const bracket = new Set<string>()
    for (const g of s.games) {
      if (!g.isPlayoff) continue
      for (const p of g.participants) playoff.add(`${g.week}:${p.memberId}`)
      if (g.bracket === 'championship') for (const p of g.participants) bracket.add(`${g.week}:${p.memberId}`)
    }
    const final = new Map<string, 'won' | 'lost'>()
    const decided = championshipFinal(s)
    if (decided) for (const p of decided.game.participants) final.set(`${decided.game.week}:${p.memberId}`, p.memberId === decided.champ ? 'won' : 'lost')
    out.set(seasonKey(s.tier, s.year), { playoff, bracket, final })
  }
  return out
}

/** Flattens every lineup file into one row per player per team-week (starters and bench). */
export function playerAppearances(lineups: SeasonLineups[], seasons: SeasonData[]): PlayerAppearance[] {
  const bySeason = seasonWeeks(seasons)
  const out: PlayerAppearance[] = []
  for (const season of lineups) {
    const weeks = bySeason.get(seasonKey(season.tier, season.year))
    for (const wk of season.weeks) {
      for (const team of wk.teams) {
        const key = `${wk.week}:${team.memberId}`
        const titleGame = weeks?.final.get(key)
        const base = {
          year: season.year,
          tier: season.tier,
          week: wk.week,
          memberId: team.memberId,
          isPlayoff: weeks?.playoff.has(key) ?? false,
          championshipBracket: weeks?.bracket.has(key) ?? false,
          ...(titleGame && { titleGame }),
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
  /** Weeks on any FFU roster, started or benched. */
  rosteredWeeks: number
  /** Distinct members who STARTED him at least once. */
  managers: number
  /** Distinct seasons he was on an FFU roster. */
  seasons: number
  /**
   * Playoff runs he was part of: team-seasons in which he STARTED at least one championship-bracket
   * game. Consolation and placement games don't count — that team missed the playoffs.
   */
  playoffApps: number
  /** Championship finals he STARTED in, won or lost. */
  titleGames: number
  /** ...and how many of those his team won. */
  titlesWon: number
}

interface Tally {
  playoffRuns: Set<string>
  titleGames: number
  titlesWon: number
  starts: number
  points: number
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
      t = { playoffRuns: new Set(), titleGames: 0, titlesWon: 0, starts: 0, points: 0, rosteredWeeks: 0, managers: new Set(), seasons: new Set() }
      byPlayer.set(a.playerId, t)
    }
    t.rosteredWeeks++
    t.seasons.add(a.year)
    if (!a.started) continue
    t.starts++
    t.points += a.points
    t.managers.add(a.memberId)
    if (a.championshipBracket) t.playoffRuns.add(`${a.year}:${a.tier}:${a.memberId}`)
    if (a.titleGame) t.titleGames++
    if (a.titleGame === 'won') t.titlesWon++
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
      rosteredWeeks: t.rosteredWeeks,
      managers: t.managers.size,
      seasons: t.seasons.size,
      playoffApps: t.playoffRuns.size,
      titleGames: t.titleGames,
      titlesWon: t.titlesWon,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
}
