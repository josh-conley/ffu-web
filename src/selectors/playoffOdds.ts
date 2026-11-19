import { PLAYOFF_FIELD, regularSeasonWeeks, tierRank, type Tier } from '@/config'
import type { SeasonData } from '@/data'
import { aroundTheUnionYear, completedUnionWeeks } from './aroundTheUnion'
import { runningRecords, type WeekRecord } from './games'

// Historical playoff odds by record: of every team that was X-Y after N games, how many went on to
// reach the playoff field, and where a win or a loss in game N+1 would have left it. Asked for by
// the commissioner, to write about in the FFUN.
//
// "Made the playoffs" is a final placing inside the playoff field (top 6). That is the same set as
// the teams with a championship-bracket game in every finished league-season, both eras (checked
// 2026-11-18), and unlike bracket tags it holds for any season file with final placings.
//
// The sample defaults to seasons of the current length (14 games). Shorter seasons can be pooled in:
// at the same record they had fewer games left, so they are opt-in (DECISIONS 2026-11-18).

export interface OddsCell {
  /** Teams at this record that reached the playoff field. */
  made: number
  /** Teams at this record. 0 means no history to go on. */
  teams: number
}

/** The finished seasons of one regular-season length. */
export interface OddsFormat {
  seasonLength: number
  firstYear: string
  lastYear: string
}

export interface CurrentTeam {
  memberId: string
  tier: Tier
  /** Their UPR at that point, when the table is by UPR. */
  upr?: number
}

export interface RecordOddsRow {
  record: WeekRecord
  now: OddsCell
  /** After one more game, won or lost. Absent once no season in the sample goes another game. */
  afterWin?: OddsCell
  afterLoss?: OddsCell
  /** This season's teams at this record after the same number of games. */
  current: CurrentTeam[]
}

/** A record with a tie in it: too rare for a row of its own, so the page notes it instead. */
export interface TiedRecord {
  record: WeekRecord
  odds: OddsCell
  current: CurrentTeam[]
}

export interface RecordOddsTable {
  games: number
  /** Every win-loss split of `games`, best first. Tied records are in `ties`. */
  rows: RecordOddsRow[]
  ties: TiedRecord[]
  /** Whether the current season has played `games` weeks yet, i.e. whether `current` means anything. */
  currentPlayed: boolean
}

/** Fewer teams than this at a record and the percentage is an anecdote; the page says so. */
export const SMALL_SAMPLE = 5

/** Some history, but too little to read the percentage as more than an anecdote. */
export const isSmallSample = (cell: OddsCell): boolean => cell.teams > 0 && cell.teams < SMALL_SAMPLE

/** Share that made it, 0–100, or undefined with no history. */
export const oddsPct = (cell: OddsCell | undefined): number | undefined =>
  cell === undefined || cell.teams === 0 ? undefined : (100 * cell.made) / cell.teams

/** A season with final placings and games to replay: the only kind with a known outcome. */
export const isFinishedSeason = (s: SeasonData): boolean =>
  s.teams.some((t) => t.finalPlacement !== undefined) && s.games.some((g) => !g.isPlayoff)

/** How many regular-season games a season ran to. */
export const regularSeasonLength = (s: SeasonData): number => regularSeasonWeeks(s.era).length
const lengthOf = regularSeasonLength

/** The teams that finished inside the playoff field: what "made the playoffs" means on the page. */
export function playoffTeams(season: SeasonData): Set<string> {
  return new Set(
    season.teams.filter((t) => t.finalPlacement !== undefined && t.finalPlacement <= PLAYOFF_FIELD.teams).map((t) => t.memberId),
  )
}

/**
 * The finished seasons by length: `primary` is the length the most recent season was played at,
 * `others` every other length, longest first.
 */
export function oddsFormats(seasons: SeasonData[]): { primary: OddsFormat | undefined; others: OddsFormat[] } {
  const finished = seasons.filter(isFinishedSeason).sort((a, b) => a.year.localeCompare(b.year))
  const byLength = new Map<number, OddsFormat>()
  for (const s of finished) {
    const length = lengthOf(s)
    const f = byLength.get(length)
    byLength.set(length, { seasonLength: length, firstYear: f?.firstYear ?? s.year, lastYear: s.year })
  }
  const latest = finished.at(-1)
  const primary = latest === undefined ? undefined : byLength.get(lengthOf(latest))
  const others = [...byLength.values()].filter((f) => f !== primary).sort((a, b) => b.seasonLength - a.seasonLength)
  return { primary, others }
}

/** The finished seasons the odds are drawn from: the current length, plus the others if asked. */
export function oddsSample(seasons: SeasonData[], includeOthers: boolean): SeasonData[] {
  const length = oddsFormats(seasons).primary?.seasonLength
  return seasons.filter(isFinishedSeason).filter((s) => includeOthers || lengthOf(s) === length)
}

/** The longest regular season in a set: how far the page's game count can go. */
export function longestSeason(seasons: SeasonData[]): number {
  return Math.max(0, ...seasons.filter(isFinishedSeason).map(lengthOf))
}

const recordKey = (r: WeekRecord): string => `${r.wins}-${r.losses}-${r.ties}`

/** Every team's record after `games` weeks, for seasons that got that far. */
function recordsAfter(season: SeasonData, games: number): Map<string, WeekRecord> {
  const out = new Map<string, WeekRecord>()
  for (const [memberId, weeks] of runningRecords(season)) {
    const record = weeks.get(games)
    if (record !== undefined) out.set(memberId, record)
  }
  return out
}

/** Record key → how many teams were at it after `games`, and how many of them made it. */
function tallyAt(sample: SeasonData[], games: number): Map<string, OddsCell & { record: WeekRecord }> {
  const tallies = new Map<string, OddsCell & { record: WeekRecord }>()
  for (const season of sample) {
    const made = playoffTeams(season)
    for (const [memberId, record] of recordsAfter(season, games)) {
      const key = recordKey(record)
      const tally = tallies.get(key) ?? { record, made: 0, teams: 0 }
      tally.made += made.has(memberId) ? 1 : 0
      tally.teams += 1
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

const cellOf = (t: OddsCell | undefined): OddsCell => ({ made: t?.made ?? 0, teams: t?.teams ?? 0 })

/** Records with a tie, from history or this season, better records first. */
function tiedRecords(
  now: Map<string, OddsCell & { record: WeekRecord }>,
  teams: Map<string, CurrentTeam[]>,
): TiedRecord[] {
  const keys = new Set([...now.keys(), ...teams.keys()].filter((k) => !k.endsWith('-0')))
  return [...keys]
    .map((key) => {
      const [wins, losses, ties] = key.split('-').map(Number)
      return { record: { wins: wins!, losses: losses!, ties: ties! }, odds: cellOf(now.get(key)), current: teams.get(key) ?? [] }
    })
    .sort((a, b) => b.record.wins + b.record.ties / 2 - (a.record.wins + a.record.ties / 2))
}

/**
 * The odds table after `games` games, drawn from `sample` (see oddsSample). `current` is the season
 * in progress, whose teams are listed against their record.
 */
export function recordOdds(sample: SeasonData[], games: number, current: SeasonData[] = []): RecordOddsTable {
  const finished = sample.filter(isFinishedSeason)
  const now = tallyAt(finished, games)
  const hasNext = finished.some((s) => lengthOf(s) > games)
  const next = hasNext ? tallyAt(finished, games + 1) : undefined
  const teams = currentByRecord(current, games)
  const rows: RecordOddsRow[] = []
  for (let wins = games; wins >= 0; wins--) {
    const record = { wins, losses: games - wins, ties: 0 }
    const row: RecordOddsRow = { record, now: cellOf(now.get(recordKey(record))), current: teams.get(recordKey(record)) ?? [] }
    if (next !== undefined) {
      row.afterWin = cellOf(next.get(recordKey({ ...record, wins: wins + 1 })))
      row.afterLoss = cellOf(next.get(recordKey({ ...record, losses: record.losses + 1 })))
    }
    rows.push(row)
  }
  return { games, rows, ties: tiedRecords(now, teams), currentPlayed: teams.size > 0 }
}

export interface OddsSeasonView {
  /** The most recent season played: the year whose teams the table lists. */
  year: string | undefined
  /** That year's leagues while still in progress; empty once its season is finished. */
  inProgress: SeasonData[]
  /** Weeks the current season has finished across all leagues, if it has started. */
  latestWeek: number | undefined
}

/** What the Playoff Odds page needs to know about the season in progress. */
export function oddsSeasonView(seasons: SeasonData[]): OddsSeasonView {
  const year = aroundTheUnionYear(seasons)
  const current = seasons.filter((s) => s.year === year && !isFinishedSeason(s))
  return { year, inProgress: current, latestWeek: completedUnionWeeks(current).at(-1) }
}
