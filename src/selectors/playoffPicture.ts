import type { PlayoffFormat } from '@/config'
import type { Game } from '@/data'
import { winnerOf } from './games'

// "If the season ended today": who would make a Sleeper league's playoffs, by the league's own
// rules. The rule (see ai-docs/DECISIONS.md, 2026-09-25) was worked out from the Sleeper settings
// and checked against the actual playoff field of every Sleeper season on file — the test runs
// that check, so a change here that breaks history fails.
//
//   1. Each division's leader qualifies.
//   2. The remaining spots go to the best of everyone else (wildcards).
//   3. Equal records are separated by the format's tiebreak: head-to-head among ALL the tied teams
//      (their combined record against each other), then points for — or points for alone.
//
// Deliberately NOT modeled: the order of seeds 3–6 (history doesn't pin it down) and clinching.
// This is a snapshot of today's table, never a claim about how the season ends.

export interface PictureEntrant {
  memberId: string
  /** Absent in a season without divisions — then every spot is a wildcard. */
  divisionId?: number
  winPct: number
  pointsFor: number
}

export type PlayoffBerth = 'division' | 'wildcard'

export interface PlayoffPicture {
  /** Every entrant: the qualifiers first, then the rest, each part in standings order. */
  order: string[]
  /** The qualifiers only, and how each got in. */
  berths: Map<string, PlayoffBerth>
}

/** Share of the games among `group` that `memberId` won (ties half); 0.5 when they haven't met. */
function recordWithin(memberId: string, group: ReadonlySet<string>, games: readonly Game[]): number {
  let won = 0
  let played = 0
  for (const game of games) {
    const ids = game.participants.map((p) => p.memberId)
    if (!ids.includes(memberId)) continue
    const opponent = ids.find((id) => id !== memberId)
    if (opponent === undefined || !group.has(opponent)) continue
    const winner = winnerOf(game)
    played += 1
    won += winner === memberId ? 1 : winner === null ? 0.5 : 0
  }
  return played > 0 ? won / played : 0.5
}

function breakTie(tied: PictureEntrant[], games: readonly Game[], format: PlayoffFormat): PictureEntrant[] {
  const byPoints = (a: PictureEntrant, b: PictureEntrant) => b.pointsFor - a.pointsFor
  if (tied.length < 2 || format.tiebreak === 'points') return [...tied].sort(byPoints)
  const group = new Set(tied.map((t) => t.memberId))
  const h2h = new Map(tied.map((t) => [t.memberId, recordWithin(t.memberId, group, games)]))
  return [...tied].sort((a, b) => (h2h.get(b.memberId) ?? 0) - (h2h.get(a.memberId) ?? 0) || byPoints(a, b))
}

/** Standings order under the format's tiebreak: win% first, then each tied group broken as one. */
export function rankForPlayoffs(entrants: readonly PictureEntrant[], games: readonly Game[], format: PlayoffFormat): PictureEntrant[] {
  const byPct = new Map<number, PictureEntrant[]>()
  for (const e of entrants) byPct.set(e.winPct, [...(byPct.get(e.winPct) ?? []), e])
  return [...byPct.keys()].sort((a, b) => b - a).flatMap((pct) => breakTie(byPct.get(pct) ?? [], games, format))
}

function divisionLeaders(entrants: readonly PictureEntrant[], games: readonly Game[], format: PlayoffFormat): PictureEntrant[] {
  const byDivision = new Map<number, PictureEntrant[]>()
  for (const e of entrants) {
    if (e.divisionId === undefined) continue
    byDivision.set(e.divisionId, [...(byDivision.get(e.divisionId) ?? []), e])
  }
  return [...byDivision.values()].flatMap((group) => rankForPlayoffs(group, games, format).slice(0, 1))
}

/**
 * Today's playoff field. `games` are the regular-season games played so far — only the ones
 * between tied teams matter, and playoff games are ignored.
 */
export function playoffPicture(entrants: readonly PictureEntrant[], games: readonly Game[], format: PlayoffFormat): PlayoffPicture {
  const regular = games.filter((g) => !g.isPlayoff)
  const leaders = divisionLeaders(entrants, regular, format)
  const leaderIds = new Set(leaders.map((l) => l.memberId))
  const wildcards = rankForPlayoffs(
    entrants.filter((e) => !leaderIds.has(e.memberId)),
    regular,
    format,
  ).slice(0, Math.max(0, format.teams - leaders.length))

  const berths = new Map<string, PlayoffBerth>()
  for (const l of leaders) berths.set(l.memberId, 'division')
  for (const w of wildcards) berths.set(w.memberId, 'wildcard')

  const ranked = rankForPlayoffs(entrants, regular, format).map((e) => e.memberId)
  return {
    order: [...ranked.filter((id) => berths.has(id)), ...ranked.filter((id) => !berths.has(id))],
    berths,
  }
}
