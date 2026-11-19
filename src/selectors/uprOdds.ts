import { tierRank } from '@/config'
import type { SeasonData } from '@/data'
import { regularSeasonWeeksPlayed } from './games'
import { isFinishedSeason, playoffTeams, regularSeasonLength, type CurrentTeam, type OddsCell } from './playoffOdds'
import { seasonUpr, UPR_MIN_WEEKS } from './upr'

// Historical playoff odds by UPR: of every team rated 150–159 after N games, how many made the
// playoff field. The Playoff Odds page's second view, beside the one by record.
//
// Ranges are raw UPR, 10 points wide (Josh's call, 2026-11-18). Raw UPR runs higher in
// high-scoring seasons (the league average after week 10 was 130 in 2023 and 143 in 2025), so a
// range mixes stronger and weaker years; the page notes it. Each rating is the ordinary seasonUpr
// over the first N games, so the formula and its UPR_MIN_WEEKS rule are the same as everywhere else.

/** Width of a UPR range, in rating points. */
export const UPR_RANGE = 10
/**
 * The table's fixed span: open-ended rows above and below it catch anything outside, so the page
 * keeps one shape week to week. They matter early: after week 3 (2018–25) 6 of 240 teams were 180+
 * and 5 under 90; by week 10 every team was inside 90–179.
 */
export const UPR_TOP = 180
export const UPR_BOTTOM = 90

export interface UprRangeRow {
  /** Bottom of the range: 150 for 150–159.99. The open rows: UPR_TOP ("180+"), or UPR_BOTTOM − UPR_RANGE ("under 90"). */
  floor: number
  /** An open-ended row: everything at or above UPR_TOP, or everything below UPR_BOTTOM. */
  open?: 'above' | 'below'
  odds: OddsCell
  /** This season's teams rated in the range after the same number of games, best first. */
  current: CurrentTeam[]
}

export interface UprOddsTable {
  games: number
  /** "180+", every range down to 90–99, then "under 90": always all of them, best first. Empty before UPR. */
  rows: UprRangeRow[]
  /** Whether the current season has played `games` weeks yet, i.e. whether `current` means anything. */
  currentPlayed: boolean
}

/** The row a rating falls in, clamped into the open rows at either end. */
const floorOf = (upr: number) =>
  Math.min(UPR_TOP, Math.max(UPR_BOTTOM - UPR_RANGE, Math.floor(upr / UPR_RANGE) * UPR_RANGE))

/** Each team's UPR over a season's first `games` games; empty if it didn't get that far. */
function uprAfter(season: SeasonData, games: number): Map<string, number> {
  const sofar = { games: season.games.filter((g) => !g.isPlayoff && g.week <= games) }
  return regularSeasonWeeksPlayed(sofar) < games ? new Map() : seasonUpr(sofar)
}

function tallyHistory(sample: SeasonData[], games: number): Map<number, OddsCell> {
  const tallies = new Map<number, OddsCell>()
  for (const season of sample) {
    if (regularSeasonLength(season) < games) continue
    const made = playoffTeams(season)
    for (const [memberId, upr] of uprAfter(season, games)) {
      const cell = tallies.get(floorOf(upr)) ?? { made: 0, teams: 0 }
      tallies.set(floorOf(upr), { made: cell.made + (made.has(memberId) ? 1 : 0), teams: cell.teams + 1 })
    }
  }
  return tallies
}

function currentByRange(current: SeasonData[], games: number): Map<number, CurrentTeam[]> {
  const out = new Map<number, CurrentTeam[]>()
  for (const season of current) {
    for (const [memberId, upr] of uprAfter(season, games)) {
      out.set(floorOf(upr), [...(out.get(floorOf(upr)) ?? []), { memberId, tier: season.tier, upr }])
    }
  }
  for (const teams of out.values()) teams.sort((a, b) => (b.upr ?? 0) - (a.upr ?? 0) || tierRank(a.tier) - tierRank(b.tier))
  return out
}

/**
 * The odds by UPR range after `games` games, drawn from `sample` (see oddsSample). `current` is the
 * season in progress, whose teams are listed in their range.
 */
export function uprOdds(sample: SeasonData[], games: number, current: SeasonData[] = []): UprOddsTable {
  if (games < UPR_MIN_WEEKS) return { games, rows: [], currentPlayed: false }
  const history = tallyHistory(sample.filter(isFinishedSeason), games)
  const teams = currentByRange(current, games)
  const rows: UprRangeRow[] = []
  for (let floor = UPR_TOP; floor >= UPR_BOTTOM - UPR_RANGE; floor -= UPR_RANGE) {
    const open = floor === UPR_TOP ? 'above' : floor < UPR_BOTTOM ? 'below' : undefined
    rows.push({ floor, open, odds: history.get(floor) ?? { made: 0, teams: 0 }, current: teams.get(floor) ?? [] })
  }
  return { games, rows, currentPlayed: teams.size > 0 }
}
