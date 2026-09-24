import type { Tier } from '@/config'
import type { DraftData, SeasonData } from '@/data'
import type { PlayerAppearance } from './playerAppearances'

// One NFL player's FFU history: who started him, season by season, where he was drafted, the titles
// he started in, and his best weeks. Built from `playerAppearances`; nothing here is stored.

export interface ManagerStint {
  memberId: string
  /** Seasons this member had him on the roster, oldest first. */
  years: string[]
  starts: number
  benchWeeks: number
  /** Points he scored for this member while started. */
  points: number
  best: number
}

export interface PlayerSeasonRow {
  year: string
  tier: Tier
  memberId: string
  starts: number
  benchWeeks: number
  points: number
}

export interface PlayerDraftRow {
  year: string
  tier: Tier
  round: number
  overall: number
  memberId: string
}

export interface PlayerTitle {
  year: string
  tier: Tier
  memberId: string
  /** What he scored in the championship final. */
  points: number
}

export interface PlayerWeek {
  year: string
  tier: Tier
  week: number
  memberId: string
  points: number
  isPlayoff: boolean
}

export interface PlayerHistory {
  managers: ManagerStint[]
  seasons: PlayerSeasonRow[]
  drafts: PlayerDraftRow[]
  titles: PlayerTitle[]
  topWeeks: PlayerWeek[]
}

const round2 = (n: number) => Math.round(n * 100) / 100
const TOP_WEEKS = 5

/** Groups by a key, creating each bucket from its first row. */
function groupBy<T, B>(rows: T[], key: (r: T) => string, create: (r: T) => B, add: (b: B, r: T) => void): B[] {
  const out = new Map<string, B>()
  for (const r of rows) {
    const k = key(r)
    let b = out.get(k)
    if (!b) out.set(k, (b = create(r)))
    add(b, r)
  }
  return [...out.values()]
}

function addWeek(row: { starts: number; benchWeeks: number; points: number }, a: PlayerAppearance) {
  if (a.started) {
    row.starts++
    row.points += a.points
  } else row.benchWeeks++
}

function managerStints(mine: PlayerAppearance[]): ManagerStint[] {
  return groupBy<PlayerAppearance, ManagerStint>(
    mine,
    (a) => a.memberId,
    (a) => ({ memberId: a.memberId, years: [], starts: 0, benchWeeks: 0, points: 0, best: 0 }),
    (m, a) => {
      if (!m.years.includes(a.year)) m.years.push(a.year)
      addWeek(m, a)
      if (a.started) m.best = Math.max(m.best, a.points)
    },
  )
    .map((m) => ({ ...m, years: [...m.years].sort(), points: round2(m.points), best: round2(m.best) }))
    .sort((a, b) => b.points - a.points || b.starts - a.starts)
}

function seasonRows(mine: PlayerAppearance[]): PlayerSeasonRow[] {
  return groupBy<PlayerAppearance, PlayerSeasonRow>(
    mine,
    (a) => `${a.year}:${a.tier}:${a.memberId}`,
    (a) => ({ year: a.year, tier: a.tier, memberId: a.memberId, starts: 0, benchWeeks: 0, points: 0 }),
    addWeek,
  )
    .map((r) => ({ ...r, points: round2(r.points) }))
    .sort((a, b) => b.year.localeCompare(a.year) || b.points - a.points)
}

/**
 * Picks of this player, matched by id. ESPN-era drafts (2018–2020) key players by an ESPN slug that
 * can't be tied to a Sleeper id reliably, so only Sleeper-era picks match — the same span the
 * lineups cover.
 */
export function playerDrafts(playerId: string, drafts: DraftData[]): PlayerDraftRow[] {
  return drafts
    .flatMap((d) =>
      d.picks
        .filter((p) => p.player.id === playerId)
        .map((p) => ({ year: d.year, tier: d.tier, round: p.round, overall: p.overall, memberId: p.memberId })),
    )
    .sort((a, b) => b.year.localeCompare(a.year) || a.overall - b.overall)
}

/** The champion of a season and the week of its title game, or undefined if it isn't decided. */
function championshipFinal(season: SeasonData): { memberId: string; week: number } | undefined {
  const champ = season.teams.find((t) => t.finalPlacement === 1)?.memberId
  if (!champ) return undefined
  const weeks = season.games
    .filter((g) => g.isPlayoff && g.bracket === 'championship' && g.participants.some((p) => p.memberId === champ))
    .map((g) => g.week)
  return weeks.length > 0 ? { memberId: champ, week: Math.max(...weeks) } : undefined
}

/** Titles he STARTED in: the league champion had him in the lineup for its championship final. */
export function playerTitles(mine: PlayerAppearance[], seasons: SeasonData[]): PlayerTitle[] {
  return seasons
    .flatMap((s) => {
      const final = championshipFinal(s)
      if (!final) return []
      const start = mine.find(
        (a) => a.started && a.year === s.year && a.tier === s.tier && a.week === final.week && a.memberId === final.memberId,
      )
      return start ? [{ year: s.year, tier: s.tier, memberId: final.memberId, points: start.points }] : []
    })
    .sort((a, b) => b.year.localeCompare(a.year))
}

function topWeeks(mine: PlayerAppearance[]): PlayerWeek[] {
  return mine
    .filter((a) => a.started)
    .sort((a, b) => b.points - a.points)
    .slice(0, TOP_WEEKS)
    .map(({ year, tier, week, memberId, points, isPlayoff }) => ({ year, tier, week, memberId, points, isPlayoff }))
}

/** Everything the player page shows for one player. Empty lists for a player FFU never rostered. */
export function playerHistory(
  playerId: string,
  appearances: PlayerAppearance[],
  seasons: SeasonData[],
  drafts: DraftData[],
): PlayerHistory {
  const mine = appearances.filter((a) => a.playerId === playerId)
  return {
    managers: managerStints(mine),
    seasons: seasonRows(mine),
    drafts: playerDrafts(playerId, drafts),
    titles: playerTitles(mine, seasons),
    topWeeks: topWeeks(mine),
  }
}
