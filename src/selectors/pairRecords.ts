import type { SeasonData } from '@/data'
import type { WinLoss } from './compare'

// Two ways of setting a pair of teams against each other beyond the games they actually played,
// for the Compare view. Both take whatever seasons they're given, so the same function answers
// "this season" and "all time".

const blank = (): WinLoss => ({ wins: 0, losses: 0, ties: 0 })

function add(r: WinLoss, mine: number, theirs: number): void {
  if (mine > theirs) r.wins += 1
  else if (mine < theirs) r.losses += 1
  else r.ties += 1
}

/** One team both members have played, and how each has done against it. */
export interface CommonOpponent {
  opponentId: string
  a: WinLoss
  b: WinLoss
}

export interface CommonOpponents {
  /** Most games against them first (both sides together). */
  opponents: CommonOpponent[]
  /** Each side's record summed over every common opponent. */
  a: WinLoss
  b: WinLoss
}

/** `memberId`'s record against each opponent, every game on file (playoffs included, as in H2H). */
function recordsByOpponent(seasons: SeasonData[], memberId: string, exclude: string): Map<string, WinLoss> {
  const out = new Map<string, WinLoss>()
  for (const season of seasons) {
    for (const game of season.games) {
      const me = game.participants.find((p) => p.memberId === memberId)
      const opp = game.participants.find((p) => p.memberId !== memberId)
      if (!me || !opp || opp.memberId === exclude) continue
      const r = out.get(opp.memberId) ?? blank()
      add(r, me.score, opp.score)
      out.set(opp.memberId, r)
    }
  }
  return out
}

const games = (r: WinLoss) => r.wins + r.losses + r.ties

function addInto(total: WinLoss, r: WinLoss): void {
  total.wins += r.wins
  total.losses += r.losses
  total.ties += r.ties
}

/**
 * Record against common opponents: everyone both members have played, not counting each other.
 * The classic tiebreaker between two teams that rarely meet — a fairer read than either's overall
 * record when they have spent their careers in different leagues.
 */
export function commonOpponents(seasons: SeasonData[], aId: string, bId: string): CommonOpponents {
  const aRecords = recordsByOpponent(seasons, aId, bId)
  const bRecords = recordsByOpponent(seasons, bId, aId)
  const opponents: CommonOpponent[] = []
  const a = blank()
  const b = blank()
  for (const [opponentId, aRec] of aRecords) {
    const bRec = bRecords.get(opponentId)
    if (!bRec) continue
    opponents.push({ opponentId, a: aRec, b: bRec })
    addInto(a, aRec)
    addInto(b, bRec)
  }
  opponents.sort((x, y) => games(y.a) + games(y.b) - (games(x.a) + games(x.b)))
  return { opponents, a, b }
}

/** Every regular-season week both played, as if they had played each other: from a's side. */
export interface WeeklySeries {
  /** Weeks a outscored b (wins), b outscored a (losses), or they matched (ties). */
  record: WinLoss
  /** The same, within each year. */
  byYear: Record<string, WinLoss>
}

/** Each member's regular-season score in every week of every season, keyed `year|week`. */
function weeklyScores(seasons: SeasonData[], memberId: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const season of seasons) {
    for (const game of season.games) {
      if (game.isPlayoff) continue
      const me = game.participants.find((p) => p.memberId === memberId)
      if (me) out.set(`${season.year}|${game.week}`, me.score)
    }
  }
  return out
}

/**
 * The "every-week series": every regular-season week both teams played, in any league, counted as
 * a game between them, higher score winning. Hundreds of weeks rather than the handful of real
 * meetings, so it says far more about who has been the better team week to week — and nothing
 * about who wins when they actually meet. Playoff weeks are left out: not every team plays them.
 */
export function weeklySeries(seasons: SeasonData[], aId: string, bId: string): WeeklySeries {
  const aScores = weeklyScores(seasons, aId)
  const bScores = weeklyScores(seasons, bId)
  const record = blank()
  const byYear: Record<string, WinLoss> = {}
  for (const [key, aScore] of aScores) {
    const bScore = bScores.get(key)
    if (bScore === undefined) continue
    const year = key.split('|')[0] ?? ''
    byYear[year] ??= blank()
    add(record, aScore, bScore)
    add(byYear[year], aScore, bScore)
  }
  return { record, byYear }
}
