import type { SeasonData } from '@/data'
import type { CareerStats } from '../career'
import { careerStats, careerUpr } from '../career'
import { buildRecordBook, type MatchupRecord, type TeamGameRecord } from '../records'
import { winPct } from '../standings'
import { seasonUpr } from '../upr'

export { RECORD_BOOK_SECTIONS, ALL_CATEGORY_IDS, type RecordCategory, type RecordSection } from './sections'

// Computes the FFU Record Book — one holder per category, DERIVED from season data (Charter: never
// stored). Returns a map of category id → entry; categories with no entry yet render blank in the UI.
// Presentation (team name resolution) stays in the component; entries carry only ids + values.

/** One record holder. `year` resolves the team's name-that-year; `yearsLabel` is the display span. */
export interface RecordEntry {
  value: string
  teamId: string
  year: string
  yearsLabel: string
  /** Optional context, e.g. the week a single-game record was set. */
  note?: string
}

/** A member's single season, flattened across all tiers — the basis for single-season records. */
interface SeasonRow {
  memberId: string
  year: string
  wins: number
  losses: number
  games: number
  pointsFor: number
  winPct: number
  upr: number
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`
const span = (c: CareerStats) => (c.firstYear === c.lastYear ? `${c.firstYear ?? ''}` : `${c.firstYear}–${c.lastYear}`)

/** argmax / argmin over items, formatted into an entry. Skips non-finite scores; null if empty. */
function leader<T>(
  items: Iterable<T>,
  score: (t: T) => number,
  mode: 'max' | 'min',
  toEntry: (t: T) => RecordEntry,
): RecordEntry | null {
  let best: T | undefined
  let bestScore = mode === 'max' ? -Infinity : Infinity
  for (const t of items) {
    const s = score(t)
    if (!Number.isFinite(s)) continue
    if (mode === 'max' ? s > bestScore : s < bestScore) {
      best = t
      bestScore = s
    }
  }
  return best === undefined ? null : toEntry(best)
}

const careerEntry = (c: CareerStats, value: string): RecordEntry =>
  ({ value, teamId: c.memberId, year: `${c.lastYear ?? ''}`, yearsLabel: span(c) })

const seasonEntry = (r: SeasonRow, value: string): RecordEntry =>
  ({ value, teamId: r.memberId, year: r.year, yearsLabel: r.year })

const gameEntry = (g: TeamGameRecord | undefined): RecordEntry | null =>
  g ? { value: g.score.toFixed(2), teamId: g.memberId, year: g.year, yearsLabel: g.year, note: g.round ?? `Wk ${g.week}` } : null

const marginEntry = (m: MatchupRecord | undefined): RecordEntry | null =>
  m ? { value: m.margin.toFixed(2), teamId: m.winnerId ?? m.teams[0]?.memberId ?? '', year: m.year, yearsLabel: m.year, note: m.round ?? `Wk ${m.week}` } : null

/** Flatten every member-season into a SeasonRow (regular-season totals + season UPR). */
function seasonRows(seasons: SeasonData[]): SeasonRow[] {
  const rows: SeasonRow[] = []
  for (const season of seasons) {
    const upr = seasonUpr(season)
    const played = new Map<string, number>()
    for (const g of season.games) {
      if (g.isPlayoff) continue
      for (const p of g.participants) played.set(p.memberId, (played.get(p.memberId) ?? 0) + 1)
    }
    for (const t of season.teams) {
      rows.push({
        memberId: t.memberId,
        year: season.year,
        wins: t.record.wins,
        losses: t.record.losses,
        games: played.get(t.memberId) ?? t.record.wins + t.record.losses + t.record.ties,
        pointsFor: t.points.for,
        winPct: winPct(t.record),
        upr: upr.get(t.memberId) ?? NaN,
      })
    }
  }
  return rows
}

/** Per-member count of winning seasons (regular-season wins > losses). */
function winningSeasons(rows: SeasonRow[], careers: Map<string, CareerStats>): RecordEntry | null {
  const counts = new Map<string, number>()
  for (const r of rows) if (r.wins > r.losses) counts.set(r.memberId, (counts.get(r.memberId) ?? 0) + 1)
  let best: { id: string; n: number } | undefined
  for (const [id, n] of counts) if (!best || n > best.n) best = { id, n }
  const c = best && careers.get(best.id)
  return c ? careerEntry(c, String(best!.n)) : null
}

/** Career UPR extreme, formatted with the member's tenure span. */
function careerUprLeader(upr: Map<string, number>, careers: Map<string, CareerStats>, mode: 'max' | 'min'): RecordEntry | null {
  return leader(
    [...upr.entries()].filter(([id]) => careers.has(id)),
    ([, v]) => v,
    mode,
    ([id, v]) => careerEntry(careers.get(id)!, v.toFixed(2)),
  )
}

export function computeRecordBook(seasons: SeasonData[]): Map<string, RecordEntry> {
  const careers = careerStats(seasons)
  const careerList = [...careers.values()]
  const rows = seasonRows(seasons)
  const withUpr = rows.filter((r) => Number.isFinite(r.upr))
  const withGames = rows.filter((r) => r.games > 0)
  const book = buildRecordBook(seasons)

  const e = new Map<string, RecordEntry>()
  const set = (id: string, entry: RecordEntry | null) => { if (entry) e.set(id, entry) }

  // Regular season
  set('rs-most-wins-reg', leader(rows, (r) => r.wins, 'max', (r) => seasonEntry(r, String(r.wins))))
  set('rs-best-winpct-reg', leader(rows, (r) => r.winPct, 'max', (r) => seasonEntry(r, pct(r.winPct))))
  set('rs-most-wins-career', leader(careerList, (c) => c.wins, 'max', (c) => careerEntry(c, String(c.wins))))
  set('rs-most-winning-seasons', winningSeasons(rows, careers))
  set('rs-most-losses-season', leader(rows, (r) => r.losses, 'max', (r) => seasonEntry(r, String(r.losses))))
  set('rs-most-losses-career', leader(careerList, (c) => c.losses, 'max', (c) => careerEntry(c, String(c.losses))))

  // Playoffs
  set('po-most-appearances', leader(careerList, (c) => c.playoffAppearances, 'max', (c) => careerEntry(c, String(c.playoffAppearances))))
  set('po-most-games', leader(careerList, (c) => c.playoffWins + c.playoffLosses, 'max', (c) => careerEntry(c, String(c.playoffWins + c.playoffLosses))))

  // Championships
  set('ch-most-champ-games', leader(careerList, (c) => c.championships + c.runnerUps, 'max', (c) => careerEntry(c, String(c.championships + c.runnerUps))))
  set('ch-most-champ-game-losses', leader(careerList, (c) => c.runnerUps, 'max', (c) => careerEntry(c, String(c.runnerUps))))
  set('ch-most-champ-wins', leader(careerList, (c) => c.championships, 'max', (c) => careerEntry(c, String(c.championships))))

  // Points & margins
  set('mov-largest-week', marginEntry(book.biggestBlowouts[0]))
  set('mov-smallest-week', marginEntry(book.closestGames[0]))
  set('tp-most-week', gameEntry(book.highestGames[0]))
  set('tp-most-season-avg', leader(withGames, (r) => r.pointsFor / r.games, 'max', (r) => seasonEntry(r, (r.pointsFor / r.games).toFixed(2))))
  set('tp-least-week', gameEntry(book.lowestGames[0]))
  set('tp-least-season-avg', leader(withGames, (r) => r.pointsFor / r.games, 'min', (r) => seasonEntry(r, (r.pointsFor / r.games).toFixed(2))))
  set('pd-best', leader(careerList, (c) => c.pointsFor - c.pointsAgainst, 'max', (c) => careerEntry(c, signed(c.pointsFor - c.pointsAgainst))))
  set('pd-worst', leader(careerList, (c) => c.pointsFor - c.pointsAgainst, 'min', (c) => careerEntry(c, signed(c.pointsFor - c.pointsAgainst))))

  // UPR
  set('upr-career-high', careerUprLeader(careerUpr(seasons), careers, 'max'))
  set('upr-career-low', careerUprLeader(careerUpr(seasons), careers, 'min'))
  set('upr-season-high', leader(withUpr, (r) => r.upr, 'max', (r) => seasonEntry(r, r.upr.toFixed(2))))
  set('upr-season-low', leader(withUpr, (r) => r.upr, 'min', (r) => seasonEntry(r, r.upr.toFixed(2))))

  return e
}
