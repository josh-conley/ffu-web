import { tierRank } from '@/config'
import type { SeasonData } from '@/data'
import { regularSeasonWeeksPlayed } from './games'
import { isFinishedSeason, playoffTeams, regularSeasonLength, type CurrentTeam, type OddsCell } from './playoffOdds'
import { seasonUpr } from './upr'

// Historical playoff odds by UPR: of every team rated 150–159 after N games, how many made the
// playoff field. The Playoff Odds page's second view, beside the one by record.
//
// Ranges are raw UPR, 10 points wide (Josh's call, 2026-11-18). Raw UPR runs higher in
// high-scoring seasons (the league average after week 10 was 130 in 2023 and 143 in 2025), so a
// range mixes stronger and weaker years; the page notes it. Each rating is the ordinary seasonUpr
// over the first N games, so the formula and its UPR_MIN_WEEKS rule are the same as everywhere else.

/** Width of a UPR range, in rating points. */
export const UPR_RANGE = 10

export interface UprRangeRow {
  /** Bottom of the range: 150 for 150–159.99. */
  floor: number
  odds: OddsCell
  /** This season's teams rated in the range after the same number of games, best first. */
  current: CurrentTeam[]
}

export interface UprOddsTable {
  games: number
  /** Every range from the highest rated to the lowest, best first, gaps included. Empty before UPR. */
  rows: UprRangeRow[]
  /** Whether the current season has played `games` weeks yet, i.e. whether `current` means anything. */
  currentPlayed: boolean
}

const floorOf = (upr: number) => Math.floor(upr / UPR_RANGE) * UPR_RANGE

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
  const history = tallyHistory(sample.filter(isFinishedSeason), games)
  const teams = currentByRange(current, games)
  const floors = [...history.keys(), ...teams.keys()]
  const rows: UprRangeRow[] = []
  if (floors.length > 0) {
    for (let floor = Math.max(...floors); floor >= Math.min(...floors); floor -= UPR_RANGE) {
      rows.push({ floor, odds: history.get(floor) ?? { made: 0, teams: 0 }, current: teams.get(floor) ?? [] })
    }
  }
  return { games, rows, currentPlayed: teams.size > 0 }
}
