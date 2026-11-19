import { PLAYOFF_FIELD, regularSeasonWeeks, tierRank, type Tier } from '@/config'
import type { SeasonData } from '@/data'
import { aroundTheUnionYear, completedUnionWeeks } from './aroundTheUnion'
import { runningRecords, type WeekRecord } from './games'

// Historical playoff odds by record: of every team that was X-Y after N games, how many went on to
// reach the championship bracket. Asked for by the commissioner for the FFUN.
//
// "Made the playoffs" is a final placing inside the playoff field (top 6). That is the same set as
// the teams with a championship-bracket game in every finished league-season, both eras (checked
// 2026-11-18), and unlike bracket tags it holds for any season file with final placings.
//
// Seasons of different lengths are kept in separate groups as well as pooled. After 10 games a
// 13-game ESPN season had 3 left and a 14-game Sleeper season 4, so the same record is a slightly
// different position. Each group carries its length, so the page can say how many games were left.

export interface OddsCell {
  /** Teams at this record that reached the playoff field. */
  made: number
  /** Teams at this record. 0 means no history to go on. */
  teams: number
}

/** The seasons of one regular-season length, e.g. the 14-game seasons of 2021–2025. */
export interface OddsGroup {
  seasonLength: number
  firstYear: string
  lastYear: string
}

export interface CurrentTeam {
  memberId: string
  tier: Tier
}

export interface OddsRow {
  record: WeekRecord
  all: OddsCell
  /** One cell per entry of `OddsTable.groups`, in the same order. */
  byGroup: OddsCell[]
  /** This season's teams at this record after the same number of games. */
  current: CurrentTeam[]
}

export interface OddsTable {
  games: number
  /** Only lengths long enough to have reached `games`, longest season first. */
  groups: OddsGroup[]
  rows: OddsRow[]
  /** Whether the current season has played `games` weeks yet, i.e. whether `current` means anything. */
  currentPlayed: boolean
}

/** A season with final placings and games to replay: the only kind with a known outcome. */
export const isFinishedSeason = (s: SeasonData): boolean =>
  s.teams.some((t) => t.finalPlacement !== undefined) && s.games.some((g) => !g.isPlayoff)

const lengthOf = (s: SeasonData): number => regularSeasonWeeks(s.era).length

/** The longest regular season on record: how far the page's game count can go. */
export function longestSeason(seasons: SeasonData[]): number {
  return Math.max(0, ...seasons.filter(isFinishedSeason).map(lengthOf))
}

const recordKey = (r: WeekRecord): string => `${r.wins}-${r.losses}-${r.ties}`

/** Better records first: win share (a tie is half), then more wins. */
const byRecord = (a: WeekRecord, b: WeekRecord): number =>
  b.wins + b.ties / 2 - (a.wins + a.ties / 2) || b.wins - a.wins

/** Every team's record after `games` weeks, for seasons that got that far. */
function recordsAfter(season: SeasonData, games: number): Map<string, WeekRecord> {
  const out = new Map<string, WeekRecord>()
  for (const [memberId, weeks] of runningRecords(season)) {
    const record = weeks.get(games)
    if (record !== undefined) out.set(memberId, record)
  }
  return out
}

function groupsFor(finished: SeasonData[], games: number): OddsGroup[] {
  const byLength = new Map<number, string[]>()
  for (const s of finished) {
    const length = lengthOf(s)
    if (length >= games) byLength.set(length, [...(byLength.get(length) ?? []), s.year])
  }
  return [...byLength]
    .map(([seasonLength, years]) => {
      const sorted = [...years].sort()
      return { seasonLength, firstYear: sorted[0]!, lastYear: sorted.at(-1)! }
    })
    .sort((a, b) => b.seasonLength - a.seasonLength)
}

/** Every win-loss split of `games`, plus any other record (a tie) that history or this season has. */
function allRecords(games: number, seen: Iterable<WeekRecord>): WeekRecord[] {
  const records = new Map<string, WeekRecord>()
  for (let wins = games; wins >= 0; wins--) {
    const r = { wins, losses: games - wins, ties: 0 }
    records.set(recordKey(r), r)
  }
  for (const r of seen) records.set(recordKey(r), r)
  return [...records.values()].sort(byRecord)
}

interface Tally {
  record: WeekRecord
  all: OddsCell
  byLength: Map<number, OddsCell>
}

function tallyHistory(finished: SeasonData[], games: number): Map<string, Tally> {
  const tallies = new Map<string, Tally>()
  for (const season of finished) {
    const placings = new Map(season.teams.map((t) => [t.memberId, t.finalPlacement]))
    for (const [memberId, record] of recordsAfter(season, games)) {
      const key = recordKey(record)
      const tally = tallies.get(key) ?? { record, all: { made: 0, teams: 0 }, byLength: new Map() }
      const cell = tally.byLength.get(lengthOf(season)) ?? { made: 0, teams: 0 }
      const place = placings.get(memberId)
      const made = place !== undefined && place <= PLAYOFF_FIELD.teams ? 1 : 0
      tally.all = { made: tally.all.made + made, teams: tally.all.teams + 1 }
      tally.byLength.set(lengthOf(season), { made: cell.made + made, teams: cell.teams + 1 })
      tallies.set(key, tally)
    }
  }
  return tallies
}

function currentByRecord(current: SeasonData[], games: number): Map<string, CurrentTeam[]> {
  const out = new Map<string, CurrentTeam[]>()
  const ordered = [...current].sort((a, b) => tierRank(a.tier) - tierRank(b.tier))
  for (const season of ordered) {
    for (const [memberId, record] of recordsAfter(season, games)) {
      const key = recordKey(record)
      out.set(key, [...(out.get(key) ?? []), { memberId, tier: season.tier }])
    }
  }
  return out
}

/**
 * The odds table after `games` games. `history` may hold any seasons (only finished ones count);
 * `current` is the season in progress, whose teams are listed against their record.
 */
export function playoffOddsByRecord(history: SeasonData[], games: number, current: SeasonData[] = []): OddsTable {
  const finished = history.filter(isFinishedSeason)
  const groups = groupsFor(finished, games)
  const tallies = tallyHistory(finished, games)
  const teams = currentByRecord(current, games)
  const currentRecords = [...teams.keys()].map((key) => {
    const [wins, losses, ties] = key.split('-').map(Number)
    return { wins: wins!, losses: losses!, ties: ties! }
  })
  const empty: OddsCell = { made: 0, teams: 0 }
  const rows = allRecords(games, [...[...tallies.values()].map((t) => t.record), ...currentRecords]).map((record) => {
    const tally = tallies.get(recordKey(record))
    return {
      record,
      all: tally?.all ?? empty,
      byGroup: groups.map((g) => tally?.byLength.get(g.seasonLength) ?? empty),
      current: teams.get(recordKey(record)) ?? [],
    }
  })
  return { games, groups, rows, currentPlayed: teams.size > 0 }
}

export interface OddsSeasonView {
  /** The most recent season played: the year whose teams the tables list. */
  year: string | undefined
  /** That year's leagues while still in progress; empty once its season is finished. */
  inProgress: SeasonData[]
  /** Weeks the current season has finished across all leagues, if it has started. */
  latestWeek: number | undefined
  /** The most games any finished season ran to. */
  maxGames: number
}

/** What the Playoff Odds page needs to know about the season in progress. */
export function oddsSeasonView(seasons: SeasonData[]): OddsSeasonView {
  const year = aroundTheUnionYear(seasons)
  const current = seasons.filter((s) => s.year === year && !isFinishedSeason(s))
  return { year, inProgress: current, latestWeek: completedUnionWeeks(current).at(-1), maxGames: longestSeason(seasons) }
}
