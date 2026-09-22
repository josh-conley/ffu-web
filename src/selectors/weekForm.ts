import type { Tier } from '@/config'
import type { Game, SeasonData } from '@/data'
import { isTie, winnerOf } from './games'

/**
 * Form: who is on a run, and who moved in their league's table this week.
 *
 * Both are read from the games up to and including a given week rather than from a season's stored
 * record, so the page can report on any completed week rather than only the latest — the recap for
 * week 6 has to say what was true in week 6.
 */

export interface Streak {
  memberId: string
  tier: Tier
  /** 'W' for a winning run, 'L' for a losing one. */
  kind: 'W' | 'L'
  length: number
  /** First week of the run — for "since week 2" phrasing. */
  fromWeek: number
  /** Games played in the season so far: a run as long as this one means they've never done
   *  otherwise — still unbeaten, or still looking for a first win. */
  gamesPlayed: number
}

interface Result {
  week: number
  outcome: 'W' | 'L' | 'T'
}

/** Each member's results in one league, oldest first, up to and including `throughWeek`. */
function resultsByMember(allGames: Game[], throughWeek: number): Map<string, Result[]> {
  const byMember = new Map<string, Result[]>()
  const games = allGames.filter((g) => !g.isPlayoff && g.week <= throughWeek).sort((a, b) => a.week - b.week)

  for (const game of games) {
    const winner = winnerOf(game)
    for (const side of game.participants) {
      const outcome: Result['outcome'] = isTie(game) ? 'T' : side.memberId === winner ? 'W' : 'L'
      const rows = byMember.get(side.memberId) ?? []
      rows.push({ week: game.week, outcome })
      byMember.set(side.memberId, rows)
    }
  }
  return byMember
}

/** The run a member is currently on, counted back from their latest game. A tie ends a run: it is
 *  neither a win nor a loss, and calling it either would be a lie in the newsletter. */
function currentStreak(memberId: string, tier: Tier, results: Result[]): Streak | undefined {
  const last = results.at(-1)
  if (last === undefined || last.outcome === 'T') return undefined
  let length = 0
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i]!.outcome !== last.outcome) break
    length++
  }
  const first = results[results.length - length]!
  return { memberId, tier, kind: last.outcome, length, fromWeek: first.week, gamesPlayed: results.length }
}

/** A run of one is a game, not a streak — the length at which form is worth reporting. */
export const MIN_STREAK = 2

/**
 * Everyone's current run in ONE league, keyed by member — every length, including one.
 *
 * Takes games rather than a season so the live path can use it too: the home page's standings read
 * a `LiveSeasonData`, which carries the same games without being a `SeasonData` (see liveWeek.ts).
 */
export function currentStreaks(games: Game[], tier: Tier, throughWeek: number): Map<string, Streak> {
  const byMember = new Map<string, Streak>()
  for (const [memberId, results] of resultsByMember(games, throughWeek)) {
    const streak = currentStreak(memberId, tier, results)
    if (streak !== undefined) byMember.set(memberId, streak)
  }
  return byMember
}

/**
 * Every active run of two or more, longest first — a single result is a game, not a streak.
 *
 * Ties inside the run are impossible by construction (they end it), so a length here is always a
 * genuine unbroken sequence.
 */
export function activeStreaks(seasons: SeasonData[], throughWeek: number, minimum = MIN_STREAK): Streak[] {
  const streaks: Streak[] = []
  for (const season of seasons) {
    for (const streak of currentStreaks(season.games, season.tier, throughWeek).values()) {
      if (streak.length >= minimum) streaks.push(streak)
    }
  }
  return streaks.sort((a, b) => b.length - a.length || b.gamesPlayed - a.gamesPlayed)
}

/** The longest runs of one kind, capped — ties on length are kept, so a cap of 3 can return 4. */
export function longestStreaks(streaks: Streak[], kind: Streak['kind'], limit = 3): Streak[] {
  const ofKind = streaks.filter((s) => s.kind === kind)
  const cutoff = ofKind[limit - 1]?.length
  return cutoff === undefined ? ofKind : ofKind.filter((s) => s.length >= cutoff)
}

export interface Mover {
  memberId: string
  tier: Tier
  /** Place in their league's table after last week. */
  from: number
  /** Place after this week. */
  to: number
  /** Places gained — negative for a fall. */
  delta: number
}

interface Standing {
  memberId: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
}

/** A league's table as it stood after `week`, ordered by the same chain the Standings page uses. */
function tableAfter(season: SeasonData, week: number): string[] {
  const rows = new Map<string, Standing>()
  const ensure = (memberId: string): Standing => {
    const existing = rows.get(memberId)
    if (existing !== undefined) return existing
    const fresh = { memberId, wins: 0, losses: 0, ties: 0, pointsFor: 0 }
    rows.set(memberId, fresh)
    return fresh
  }

  for (const game of season.games) {
    if (game.isPlayoff || game.week > week) continue
    const winner = winnerOf(game)
    for (const side of game.participants) {
      const row = ensure(side.memberId)
      row.pointsFor += side.score
      if (isTie(game)) row.ties++
      else if (side.memberId === winner) row.wins++
      else row.losses++
    }
  }

  const pct = (r: Standing) => {
    const games = r.wins + r.losses + r.ties
    return games > 0 ? (r.wins + r.ties * 0.5) / games : 0
  }
  return [...rows.values()]
    .sort((a, b) => pct(b) - pct(a) || b.pointsFor - a.pointsFor)
    .map((r) => r.memberId)
}

/**
 * How far each team moved in its own league's table this week, biggest climb first.
 *
 * Within a league, not across the Union: the three tables are separate competitions, and "up four
 * places" only means something inside the one you're in. Week 1 has nothing to compare against and
 * returns nothing.
 */
export function weekMovers(seasons: SeasonData[], week: number): Mover[] {
  if (week <= 1) return []
  const movers: Mover[] = []
  for (const season of seasons) {
    const before = tableAfter(season, week - 1)
    const after = tableAfter(season, week)
    after.forEach((memberId, i) => {
      const was = before.indexOf(memberId)
      if (was < 0) return
      const from = was + 1
      const to = i + 1
      if (from !== to) movers.push({ memberId, tier: season.tier, from, to, delta: from - to })
    })
  }
  return movers.sort((a, b) => b.delta - a.delta)
}
