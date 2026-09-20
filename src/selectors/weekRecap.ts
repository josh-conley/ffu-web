import type { Tier } from '@/config'
import type { Game, SeasonData } from '@/data'
import { isTie } from './games'

/**
 * The week's matchup stories — the beats a recap leads with once the top and bottom scores are out
 * of the way: the rout, the nail-biter, and the two teams the schedule treated unfairly.
 *
 * Regular season only, and scoped to ONE finished week: this is a recap, not the record book
 * (`selectors/records.ts` holds the all-time versions of the same four ideas).
 */

/** One game, phrased as the recap tells it: winner first, with the two ways of measuring it. */
export interface WeekMatchup {
  tier: Tier
  week: number
  winnerId: string
  winnerScore: number
  loserId: string
  loserScore: number
  /** Winner's score less the loser's. 0 for a tie. */
  margin: number
  /** Both teams' scores added — how big the game was, regardless of who won. */
  combined: number
  /** A tie has no winner; `winnerId` is then simply the first team listed. */
  tied: boolean
}

function toMatchup(game: Game, tier: Tier): WeekMatchup | undefined {
  const [a, b] = game.participants
  if (a === undefined || b === undefined) return undefined
  const [winner, loser] = a.score >= b.score ? [a, b] : [b, a]
  return {
    tier,
    week: game.week,
    winnerId: winner.memberId,
    winnerScore: winner.score,
    loserId: loser.memberId,
    loserScore: loser.score,
    margin: winner.score - loser.score,
    combined: a.score + b.score,
    tied: isTie(game),
  }
}

/** Every regular-season game played in `week`, across the leagues given. */
export function weekMatchups(seasons: SeasonData[], week: number): WeekMatchup[] {
  const games: WeekMatchup[] = []
  for (const season of seasons) {
    for (const game of season.games) {
      if (game.isPlayoff || game.week !== week) continue
      const matchup = toMatchup(game, season.tier)
      if (matchup !== undefined) games.push(matchup)
    }
  }
  return games
}

export interface WeekNotes {
  /** Widest margin of the week. */
  blowout: WeekMatchup | undefined
  /** Narrowest margin — ties excluded, since a tie is its own story rather than a close finish. */
  nailbiter: WeekMatchup | undefined
  /** The week's highest score that still LOST: the team the schedule robbed. */
  unluckiestLoss: WeekMatchup | undefined
  /** The week's lowest score that still WON: the team the schedule carried. */
  luckiestWin: WeekMatchup | undefined
  /** Games that ended level — rare enough to be worth calling out when one happens. */
  ties: WeekMatchup[]
}

/** Pick the extreme of a list, or nothing when there is nothing to pick from. */
function best<T>(rows: T[], better: (a: T, b: T) => boolean): T | undefined {
  return rows.reduce<T | undefined>((pick, row) => (pick === undefined || better(row, pick) ? row : pick), undefined)
}

/**
 * The four stories, in one pass.
 *
 * Decided games only for the luckiest/unluckiest pair: a tie has neither a winner to have been
 * carried nor a loser to have been robbed, and including them would hand "lowest-scoring win" to a
 * team that didn't win.
 */
export function weekNotes(seasons: SeasonData[], week: number): WeekNotes {
  const games = weekMatchups(seasons, week)
  const decided = games.filter((g) => !g.tied)
  return {
    blowout: best(decided, (a, b) => a.margin > b.margin),
    nailbiter: best(decided, (a, b) => a.margin < b.margin),
    unluckiestLoss: best(decided, (a, b) => a.loserScore > b.loserScore),
    luckiestWin: best(decided, (a, b) => a.winnerScore < b.winnerScore),
    ties: games.filter((g) => g.tied),
  }
}
