import { winPct, type CompareSide, type MemberComparison, type SeasonCompare, type SeasonSide, type WinLoss } from '@/selectors'
import { formatPoints, ordinal, recordLabel } from '../format'
import { LEAGUE_STYLES } from '../leagues'
import { teamAbbr } from '../seriesText'
import type { Better } from './better'
import { ScopeGroupRow, ScopeRow, ScopeTable, type ScopePair } from './ScopeRows'
import { VsRows } from './VsRows'

// Every figure a season and a career both have, the latest season beside the whole career. The
// season's record and points are Sleeper's stored figures, as on Standings; the career's are the
// same as the Stats table's "All leagues" row, so neither page can disagree with this one.

/** The figures both scopes share, so each row is written once and read off either. */
interface Figures {
  record: WinLoss
  pointsFor: number
  pointsAgainst: number
  high: number | undefined
  low: number | undefined
  upr: number | undefined
}

const fromSeason = (s: SeasonSide | undefined): Figures | undefined =>
  s && { record: s.team.record, pointsFor: s.team.points.for, pointsAgainst: s.team.points.against, high: s.highLow?.high, low: s.highLow?.low, upr: s.upr }

const fromCareer = ({ career: c, upr }: CompareSide): Figures => ({
  record: { wins: c.wins, losses: c.losses, ties: c.ties },
  pointsFor: c.pointsFor,
  pointsAgainst: c.pointsAgainst,
  high: c.careerHighGame ?? undefined,
  low: c.careerLowGame ?? undefined,
  upr,
})

const dash = '—'
const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const signed = (n: number) => `${n > 0 ? '+' : ''}${formatPoints(n)}`
const games = (f: Figures) => f.record.wins + f.record.losses + f.record.ties
const ppg = (f: Figures) => (games(f) === 0 ? undefined : f.pointsFor / games(f))
const diff = (f: Figures) => f.pointsFor - f.pointsAgainst

interface Line {
  label: string
  title?: string
  /** The figure, formatted; undefined for one there isn't yet (no game played, no rating). */
  show: (f: Figures) => string | undefined
  /** The number to pick the better side by; none for a figure that isn't a contest. */
  value?: (f: Figures) => number | undefined
  better?: Better
}

const UPR: Line = { label: 'UPR', title: 'Union Power Rating: this season’s (rated from week 3), and the average of their seasons', show: (f) => f.upr?.toFixed(2), value: (f) => f.upr }

const RESULTS: Line[] = [
  { label: 'Record', show: (f) => recordLabel(f.record), value: (f) => winPct(f.record) },
  { label: 'Win %', show: (f) => pct(winPct(f.record)), value: (f) => winPct(f.record) },
]

const SCORING: Line[] = [
  { label: 'PPG', title: 'Points per game', show: (f) => ppg(f)?.toFixed(2), value: ppg },
  { label: 'Points For', show: (f) => formatPoints(f.pointsFor), value: (f) => f.pointsFor },
  { label: 'Point Diff', show: (f) => signed(diff(f)), value: diff },
  { label: 'High Game', show: (f) => (f.high === undefined ? undefined : formatPoints(f.high)), value: (f) => f.high },
  { label: 'Low Game', show: (f) => (f.low === undefined ? undefined : formatPoints(f.low)) },
]

/** Both sides' figure, a dash for a side without one; a contest only when both have a value. */
function pairOf(a: Figures | undefined, b: Figures | undefined, { show, value }: Line): ScopePair {
  const [va, vb] = [a && value?.(a), b && value?.(b)]
  const figure = (f: Figures | undefined) => (f && show(f)) ?? dash
  return { a: figure(a), b: figure(b), values: va !== undefined && vb !== undefined ? [va, vb] : undefined }
}

/** Each side's figures in each scope: a side that sat the season out has none for it. */
interface Scopes {
  season: [Figures | undefined, Figures | undefined]
  career: [Figures, Figures]
}

function Lines({ lines, season, career }: { lines: Line[] } & Scopes) {
  return lines.map((line) => (
    <ScopeRow key={line.label} label={line.label} title={line.title} season={pairOf(...season, line)} career={pairOf(...career, line)} better={line.better} />
  ))
}

/** The rows only a season has: the league each team is in, and its place there. */
function SeasonOnlyRows({ season: { a, b } }: { season: SeasonCompare }) {
  const league = (s: SeasonSide | undefined) => (s ? <span className={`font-sans font-bold ${LEAGUE_STYLES[s.tier].readableText}`}>{LEAGUE_STYLES[s.tier].label}</span> : dash)
  // A standing is only comparable inside one league: 2nd in Premier isn't "behind" 1st in National.
  const sameLeague = a !== undefined && b !== undefined && a.tier === b.tier
  return (
    <>
      <ScopeRow label="League" season={{ a: league(a), b: league(b) }} />
      <ScopeRow
        label="Standing"
        title="Regular-season place in their own league"
        season={{ a: a ? ordinal(a.rank) : dash, b: b ? ordinal(b.rank) : dash, values: sameLeague ? [a.rank, b.rank] : undefined }}
        better="low"
      />
    </>
  )
}

export function SeasonCareerCompare({ comparison, season }: { comparison: MemberComparison; season: SeasonCompare }) {
  const { a, b, h2h, series, common, weekly } = comparison
  const scopes: Scopes = { season: [fromSeason(season.a), fromSeason(season.b)], career: [fromCareer(a), fromCareer(b)] }
  return (
    <ScopeTable aLabel={teamAbbr(a.memberId)} bLabel={teamAbbr(b.memberId)} year={season.year} caption={`${season.year} season and career comparison`}>
      <ScopeGroupRow label="Standing" />
      <SeasonOnlyRows season={season} />
      <Lines lines={[UPR]} {...scopes} />
      <ScopeGroupRow label="Results" />
      <Lines lines={RESULTS} {...scopes} />
      <ScopeGroupRow label="Scoring" />
      <Lines lines={SCORING} {...scopes} />
      <VsRows
        season={{ h2h: series.byYear[season.year], common: season.common, weekly: season.weekly }}
        career={{ h2h: { wins: h2h.wins, losses: h2h.losses, ties: h2h.ties }, common, weekly }}
      />
    </ScopeTable>
  )
}
