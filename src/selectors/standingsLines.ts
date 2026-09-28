import { tiersForYear, type PlayoffFormat, type Tier } from '@/config'
import type { LiveSeasonData, SeasonData, SeasonTeam } from '@/data'
import { hasBeenPlayed, regularSeasonComplete, type WeekRecord } from './games'
import type { LiveStandingRow } from './liveWeek'
import { recordKey, type BaseRate, type PlayoffBaseRates } from './playoffBaseRates'
import { playoffPicture, type PictureEntrant, type PlayoffPicture } from './playoffPicture'
import { winPct } from './standings'

// What the Standings tables draw on top of the plain order: where each finished season's teams
// went (up or down a league), and — while a season is being played — the playoff line, with the
// historical base rate for each team's record.

/** Base rates say nothing useful about a record after one or two games. */
export const BASE_RATE_MIN_WEEK = 3

export type SeasonMove = 'promoted' | 'relegated'

/** Where a finished season sent this team — from the stored flags (unset on ESPN-era seasons). */
export function seasonMove(team: SeasonTeam): SeasonMove | undefined {
  if (team.promoted) return 'promoted'
  if (team.relegated) return 'relegated'
  return undefined
}

/** Leagues that exist the year after `year` but not in it — the Union's 2022 expansion added
 *  Masters, so the 2021 flags don't cover everyone who changed league. */
export function leaguesAddedAfter(year: string): Tier[] {
  const now = new Set(tiersForYear(year))
  return tiersForYear(String(Number(year) + 1)).filter((t) => !now.has(t))
}

/** Every league but the bottom one sends two teams down — through the Toilet Bowl, which every
 *  non-playoff team plays in (see ai-docs/DECISIONS.md, 2026-09-25). */
export function hasRelegation(tier: Tier, year: string): boolean {
  const tiers = tiersForYear(year)
  return tiers.includes(tier) && tiers.at(-1) !== tier
}

/** Today's playoff field for a season file that is part-way through its regular season; undefined
 *  before a game is played and once the regular season is over (then the bracket is the fact). */
export function seasonPlayoffPicture(season: SeasonData, format: PlayoffFormat): PlayoffPicture | undefined {
  if (!hasBeenPlayed(season) || regularSeasonComplete(season)) return undefined
  const entrants: PictureEntrant[] = season.teams.map((t) => ({
    memberId: t.memberId,
    ...(t.divisionId === undefined ? {} : { divisionId: t.divisionId }),
    winPct: winPct(t.record),
    pointsFor: t.points.for,
  }))
  return playoffPicture(entrants, season.games, format)
}

/** The same for the home page's live table: records from completed weeks only, divisions from the
 *  season file (Sleeper's live payload doesn't carry them). */
export function livePlayoffPicture(
  data: LiveSeasonData,
  rows: readonly LiveStandingRow[],
  divisions: ReadonlyMap<string, number>,
  format: PlayoffFormat,
): PlayoffPicture | undefined {
  if (data.currentWeek <= 1) return undefined
  const entrants: PictureEntrant[] = rows.map(({ totals }) => {
    const divisionId = divisions.get(totals.memberId)
    return { memberId: totals.memberId, ...(divisionId === undefined ? {} : { divisionId }), winPct: totals.winPct, pointsFor: totals.pointsFor }
  })
  return playoffPicture(entrants, data.games.filter((g) => g.week < data.currentWeek), format)
}

/** Each team's division, from a season file. */
export function divisionsOf(season: SeasonData | undefined): Map<string, number> {
  const out = new Map<string, number>()
  for (const t of season?.teams ?? []) if (t.divisionId !== undefined) out.set(t.memberId, t.divisionId)
  return out
}

/** Rows re-ordered into the picture (qualifiers first), each ranked by its new position. */
export function inPictureOrder<R extends { rank: number }>(rows: readonly R[], picture: PlayoffPicture, idOf: (row: R) => string): R[] {
  const position = new Map(picture.order.map((id, i) => [id, i]))
  return [...rows]
    .sort((a, b) => (position.get(idOf(a)) ?? Infinity) - (position.get(idOf(b)) ?? Infinity))
    .map((row, i) => ({ ...row, rank: i + 1 }))
}

/** The first team below the playoff line, which the divider row sits above. */
export function firstOutside(picture: PlayoffPicture): string | undefined {
  return picture.order.find((id) => !picture.berths.has(id))
}

/** A record's base rate — only from week 3 on, and only when history has seen that record. */
export function baseRateFor(rates: PlayoffBaseRates | undefined, record: WeekRecord): BaseRate | undefined {
  if (rates === undefined || rates.week < BASE_RATE_MIN_WEEK) return undefined
  return rates.byRecord.get(recordKey(record))
}
