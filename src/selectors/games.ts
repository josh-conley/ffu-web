import type { Game, GameParticipant, SeasonData } from '@/data'

// Per-game derivations + regular-season aggregation. This is the base "derive winners/records/
// margins from symmetric participants" layer — winner is NEVER stored, always computed here.

export function isTie(game: Game): boolean {
  const [a, b] = game.participants
  return a !== undefined && b !== undefined && a.score === b.score
}

/** Winning memberId, or null for a tie. */
export function winnerOf(game: Game): string | null {
  const [a, b] = game.participants
  if (a === undefined || b === undefined || a.score === b.score) return null
  return a.score > b.score ? a.memberId : b.memberId
}

/** Absolute scoring margin. */
export function marginOf(game: Game): number {
  const [a, b] = game.participants
  if (a === undefined || b === undefined) return 0
  return Math.abs(a.score - b.score)
}

export function scoreFor(game: Game, memberId: string): number | undefined {
  return game.participants.find((p) => p.memberId === memberId)?.score
}

export function opponentOf(game: Game, memberId: string): GameParticipant | undefined {
  return game.participants.find((p) => p.memberId !== memberId)
}

export interface TeamTotals {
  memberId: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  scores: number[]
  high: number
  low: number
  average: number
  winPct: number
}

function emptyTotals(memberId: string): TeamTotals {
  return {
    memberId,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    scores: [],
    high: 0,
    low: 0,
    average: 0,
    winPct: 0,
  }
}

function applyGame(totals: TeamTotals, own: number, opp: number): void {
  totals.scores.push(own)
  totals.pointsFor += own
  totals.pointsAgainst += opp
  if (own > opp) totals.wins += 1
  else if (own < opp) totals.losses += 1
  else totals.ties += 1
}

function finalize(totals: TeamTotals): void {
  if (totals.scores.length > 0) {
    totals.high = Math.max(...totals.scores)
    totals.low = Math.min(...totals.scores)
    totals.average = totals.scores.reduce((sum, s) => sum + s, 0) / totals.scores.length
  }
  const games = totals.wins + totals.losses + totals.ties
  totals.winPct = games > 0 ? (totals.wins + totals.ties * 0.5) / games : 0
}

/** Per-member totals over the regular season (excludes playoff games). */
export function regularSeasonTotals(season: SeasonData): Map<string, TeamTotals> {
  const totals = new Map<string, TeamTotals>()
  const ensure = (id: string): TeamTotals => {
    let t = totals.get(id)
    if (t === undefined) {
      t = emptyTotals(id)
      totals.set(id, t)
    }
    return t
  }

  for (const game of season.games) {
    if (game.isPlayoff) continue
    const [a, b] = game.participants
    if (a === undefined || b === undefined) continue
    applyGame(ensure(a.memberId), a.score, b.score)
    applyGame(ensure(b.memberId), b.score, a.score)
  }

  for (const t of totals.values()) finalize(t)
  return totals
}

/** Per-member high/low single-game score across ALL of a season's games (incl. playoffs). */
export function seasonHighLow(season: SeasonData): Map<string, { high: number; low: number }> {
  const out = new Map<string, { high: number; low: number }>()
  for (const game of season.games) {
    for (const p of game.participants) {
      const cur = out.get(p.memberId)
      if (cur === undefined) out.set(p.memberId, { high: p.score, low: p.score })
      else {
        cur.high = Math.max(cur.high, p.score)
        cur.low = Math.min(cur.low, p.score)
      }
    }
  }
  return out
}

export interface WeekGames {
  week: number
  games: Game[]
}

/** Games grouped by week, ascending (for week-by-week views like Matchups). */
export function gamesByWeek(season: SeasonData): WeekGames[] {
  const byWeek = new Map<number, Game[]>()
  for (const game of season.games) {
    const games = byWeek.get(game.week)
    if (games === undefined) byWeek.set(game.week, [game])
    else games.push(game)
  }
  return [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([week, games]) => ({ week, games }))
}
