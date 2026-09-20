import type { Tier } from '@/config/types'
import type { SeasonData } from '@/data'
import { hasBeenPlayed } from './games'

/**
 * "Around the Union" — the two blocks the FFUN's page 2 has carried for years, derived instead of
 * retyped: last week's top scorers across all three leagues, and the league-vs-league points race
 * that tracks the high-score payouts.
 *
 * Deliberately built on the STATIC season files (the ones the Tuesday refresh Action writes), not
 * on the live Sleeper path: both blocks are about weeks that have FINISHED, which is exactly what
 * those files hold. That keeps the page free of network calls and makes every number here the same
 * number Standings and Matchups show.
 */

/** One team's score in one week, as a candidate for the week's top scores. */
export interface WeekScore {
  memberId: string
  tier: Tier
  week: number
  score: number
  /** Competition rank within the week across ALL leagues, best score first — ties share a rank. */
  rank: number
  /** The opponent they put it up against, for context in the callout. */
  opponentId: string
  opponentScore: number
}

export interface LeaguePointsRow {
  tier: Tier
  /** Season-to-date regular-season points scored by the whole league. */
  totalPoints: number
  /** Points per team-game — total ÷ games played by its teams. 0 before a week has been played. */
  averageGame: number
  /** Rank by total points, highest first; ties share a rank. */
  rank: number
}

/** Regular-season games only — playoff weeks are a different competition and aren't in the race. */
const regularSeason = (season: SeasonData) => season.games.filter((g) => !g.isPlayoff)

/**
 * Weeks that are finished ACROSS THE UNION, oldest first.
 *
 * The intersection of the tiers, not the union of them: this page compares leagues against each
 * other, so a week where only two of the three have been written would report a "top 3" drawn from
 * a partial field. The weekly refresh moves all tiers together, so the intersection is normally
 * every week played — but a half-written week must not become a published leaderboard.
 */
export function completedUnionWeeks(seasons: SeasonData[]): number[] {
  const played = seasons.filter(hasBeenPlayed)
  if (played.length === 0) return []
  const perTier = played.map((s) => new Set(regularSeason(s).map((g) => g.week)))
  const [first, ...rest] = perTier
  if (first === undefined) return []
  return [...first].filter((week) => rest.every((weeks) => weeks.has(week))).sort((a, b) => a - b)
}

/** The most recent week finished across all leagues — what the page opens on. */
export function latestUnionWeek(seasons: SeasonData[]): number | undefined {
  return completedUnionWeeks(seasons).at(-1)
}

/** Every team's score in one week, across all the leagues given, unranked. */
function weekEntries(seasons: SeasonData[], week: number): Omit<WeekScore, 'rank'>[] {
  const scores: Omit<WeekScore, 'rank'>[] = []
  for (const season of seasons) {
    for (const game of regularSeason(season)) {
      if (game.week !== week) continue
      const [a, b] = game.participants
      if (a === undefined || b === undefined) continue
      scores.push({ memberId: a.memberId, tier: season.tier, week, score: a.score, opponentId: b.memberId, opponentScore: b.score })
      scores.push({ memberId: b.memberId, tier: season.tier, week, score: b.score, opponentId: a.memberId, opponentScore: a.score })
    }
  }
  return scores
}

/** Competition-rank a week already sorted best-first; ties share a rank (1, 2, 2, 4). */
function ranked(sorted: Omit<WeekScore, 'rank'>[]): WeekScore[] {
  const rows: WeekScore[] = []
  sorted.forEach((entry, i) => {
    const prev = sorted[i - 1]
    const rank = prev !== undefined && prev.score === entry.score ? (rows[i - 1]?.rank ?? i + 1) : i + 1
    rows.push({ ...entry, rank })
  })
  return rows
}

/**
 * The week's highest scores across every league, highest first.
 *
 * Ranked on score alone with no per-league quota: the whole point of the block is that one league
 * can sweep the podium, which is the hype the payout tracking is for.
 */
export function topScoresForWeek(seasons: SeasonData[], week: number, limit = 3): WeekScore[] {
  const rows = ranked(weekEntries(seasons, week).sort((x, y) => y.score - x.score))
  const cutoff = rows[limit - 1]
  return cutoff === undefined ? rows : rows.filter((r) => r.rank <= cutoff.rank)
}

/**
 * The week's LOWEST scores, lowest first.
 *
 * Ranked from the TOP of the field like every other block, so the worst score in a 36-team week
 * reads "36th" rather than "1st" — a low-score list numbered 1, 2, 3 looks like a podium, which is
 * exactly the wrong thing for the block to imply. That means ranking the whole week and keeping
 * the tail, rather than sorting the other way and counting up.
 */
export function bottomScoresForWeek(seasons: SeasonData[], week: number, limit = 3): WeekScore[] {
  const rows = ranked(weekEntries(seasons, week).sort((x, y) => y.score - x.score))
  const cutoff = rows[rows.length - limit]
  const kept = cutoff === undefined ? rows : rows.filter((r) => r.rank >= cutoff.rank)
  return kept.reverse()
}

/**
 * Each league's points scored this season, ranked.
 *
 * Reads the STORED team totals rather than re-adding the games, for the same reason Standings does
 * (see selectors/standings.ts): those are the provider's season-to-date figures, so the total here
 * is always the sum of the Points For column on the Standings page. Sleeper's own aggregate can
 * drift from the sum of its weekly scores by a point or two on historical seasons, and a league
 * total that disagrees with the table it's adding up would look like a bug.
 */
export function leaguePointsRace(seasons: SeasonData[]): LeaguePointsRow[] {
  const rows = seasons.filter(hasBeenPlayed).map((season) => {
    const totalPoints = season.teams.reduce((sum, t) => sum + t.points.for, 0)
    const teamGames = season.teams.reduce((sum, t) => sum + t.record.wins + t.record.losses + t.record.ties, 0)
    return { tier: season.tier, totalPoints, averageGame: teamGames > 0 ? totalPoints / teamGames : 0, rank: 0 }
  })
  rows.sort((a, b) => b.totalPoints - a.totalPoints)
  rows.forEach((row, i) => {
    const prev = rows[i - 1]
    row.rank = prev !== undefined && prev.totalPoints === row.totalPoints ? prev.rank : i + 1
  })
  return rows
}

/**
 * The season this page reports on: the most recent year that has actually been played.
 *
 * Not simply the newest year on file — the season being played has a data file from the day its
 * leagues are created on Sleeper, months before week 1 (see hasBeenPlayed), and reporting on it
 * then would replace last season's final numbers with three empty leagues all offseason.
 */
export function aroundTheUnionYear(seasons: SeasonData[]): string | undefined {
  const played = seasons.filter(hasBeenPlayed).map((s) => Number(s.year))
  return played.length > 0 ? String(Math.max(...played)) : undefined
}

export interface UnionHighlight {
  year: string
  week: number
  /** That week's podium, highest first. */
  scores: WeekScore[]
  race: LeaguePointsRow[]
}

/**
 * Everything the home page's Around the Union panel needs, for the most recently completed week.
 *
 * Null unless the season it comes from is the one being PLAYED (`liveYear`, per LIVE_LEAGUE_IDS).
 * In the offseason the latest completed week is last January's, and a front-door panel shouting
 * about a week that finished months ago reads as a stale site rather than a live league — the
 * dedicated page still has it.
 */
export function unionHighlight(seasons: SeasonData[], liveYear: string | undefined): UnionHighlight | null {
  const year = aroundTheUnionYear(seasons)
  if (year === undefined || year !== liveYear) return null
  const yearSeasons = seasons.filter((s) => s.year === year)
  const week = completedUnionWeeks(yearSeasons).at(-1)
  if (week === undefined) return null
  const scores = topScoresForWeek(yearSeasons, week)
  return scores.length === 0 ? null : { year, week, scores, race: leaguePointsRace(yearSeasons) }
}
