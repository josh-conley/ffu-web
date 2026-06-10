import type { ReactNode } from 'react'
import { getMember } from '@/config'
import type { Tier } from '@/config/types'
import type { CareerEfficiency, CareerStats, SeasonFinish } from '@/selectors'
import type { Column } from '@/components/DataTable'
import { FaTrophy, FaMedal, FaAward, FaToilet } from 'react-icons/fa6'
import { LEAGUE_STYLES } from '@/components/leagues'
import { TeamLogo } from '@/components/TeamLogo'

// Column definitions for the All-Time Stats page, mirroring the old site's Career Statistics
// table. Split into small group builders to stay within the file/function line caps; the page
// just composes them. Tier colors come only from LEAGUE_STYLES (DRY).

const games = (c: CareerStats) => c.wins + c.losses + c.ties
const dash = <span className="text-muted">—</span>
const f1 = (n: number) => n.toFixed(1) // ranks (not a point value)
const f2 = (n: number) => n.toFixed(2) // game/point values → hundredths

/** Point differential, signed and color-coded (green positive, red negative). */
function diffCell(c: CareerStats): ReactNode {
  const d = c.pointsFor - c.pointsAgainst
  const tone = d > 0 ? 'text-positive' : d < 0 ? 'text-negative' : 'text-muted'
  return (
    <span className={`font-medium ${tone}`}>
      {d >= 0 ? '+' : ''}
      {d.toFixed(2)}
    </span>
  )
}

/** A right-aligned numeric column; `fmt` formats the extracted value (also used for sorting). */
function numCol(
  key: string,
  header: string,
  get: (c: CareerStats) => number,
  fmt: (n: number) => ReactNode = (n) => n,
): Column<CareerStats> {
  return { key, header, align: 'right', sortValue: get, render: (c) => fmt(get(c)) }
}

function identityColumns(): Column<CareerStats>[] {
  return [
    {
      key: 'team',
      header: 'Team',
      sortValue: (c) => getMember(c.memberId)?.name ?? c.memberId,
      render: (c) => {
        const member = getMember(c.memberId)
        return (
          // Mobile: logo + abbreviation so the pinned column stays narrow; desktop shows the full
          // name. The logo (not the name) opens the team profile — names aren't links anywhere.
          <span className="flex items-center gap-2">
            <TeamLogo ffuId={c.memberId} size={22} />
            <span className="font-medium sm:hidden">{member?.abbreviation ?? '?'}</span>
            <span className="hidden font-medium whitespace-nowrap sm:inline">{member?.name ?? c.memberId}</span>
          </span>
        )
      },
    },
    numCol('seasons', 'Seasons', (c) => c.seasons),
    { key: 'record', header: 'Record', align: 'right', sortValue: (c) => c.wins, render: (c) => `${c.wins}-${c.losses}${c.ties > 0 ? `-${c.ties}` : ''}` },
    numCol('winpct', 'Win%', (c) => c.winPct, (n) => `${(n * 100).toFixed(1)}%`),
    { key: 'playoffRec', header: 'Playoff Rec', align: 'right', sortValue: (c) => c.playoffWins, render: (c) => (c.playoffWins || c.playoffLosses ? `${c.playoffWins}-${c.playoffLosses}` : dash) },
  ]
}

function scoringColumns(): Column<CareerStats>[] {
  return [
    numCol('pf', 'Points For', (c) => c.pointsFor, f2),
    numCol('pa', 'Points Agst', (c) => c.pointsAgainst, f2),
    { key: 'diff', header: 'Point Diff', align: 'right', sortValue: (c) => c.pointsFor - c.pointsAgainst, render: diffCell },
    numCol('ppg', 'Avg PPG', (c) => (games(c) ? c.pointsFor / games(c) : 0), f2),
    numCol('high', 'High Game', (c) => c.careerHighGame ?? 0, (n) => (n ? f2(n) : dash)),
    numCol('low', 'Low Game', (c) => c.careerLowGame ?? 0, (n) => (n ? f2(n) : dash)),
  ]
}

function renderTiers(c: CareerStats): ReactNode {
  const cells: [Tier, number][] = [
    ['PREMIER', c.premierSeasons],
    ['MASTERS', c.mastersSeasons],
    ['NATIONAL', c.nationalSeasons],
  ]
  return (
    <span className="inline-flex justify-end gap-1.5 tabular-nums">
      {cells.map(([tier, n]) => (
        <span key={tier} className={n > 0 ? `font-semibold ${LEAGUE_STYLES[tier].text}` : 'text-muted'} title={`${LEAGUE_STYLES[tier].label}: ${n}`}>
          {n}
        </span>
      ))}
    </span>
  )
}

const isLast = (f: SeasonFinish) => f.finalPlacement !== null && f.finalPlacement === f.seasonSize && f.seasonSize > 3

/** A finish column: one tier-colored icon per qualifying season (year on hover), or a dash. */
function placementCol(key: string, header: string, icon: ReactNode, match: (f: SeasonFinish) => boolean): Column<CareerStats> {
  return {
    key,
    header,
    align: 'center',
    sortValue: (c) => c.finishes.filter(match).length,
    render: (c) => {
      const hits = c.finishes.filter(match).sort((a, b) => a.year.localeCompare(b.year))
      if (hits.length === 0) return dash
      return (
        <span className="inline-flex flex-wrap items-center justify-center gap-0.5">
          {hits.map((f, i) => (
            <span key={i} className={LEAGUE_STYLES[f.tier].text} title={`${LEAGUE_STYLES[f.tier].label} ${f.year}`}>
              {icon}
            </span>
          ))}
        </span>
      )
    },
  }
}

// Tiers sort: Premier first, then Masters, then National as tiebreakers.
const tiersSort = (c: CareerStats) => c.premierSeasons * 10_000 + c.mastersSeasons * 100 + c.nationalSeasons

function finishColumns(): Column<CareerStats>[] {
  return [
    placementCol('titles', 'Titles', <FaTrophy size={13} />, (f) => f.finalPlacement === 1),
    placementCol('second', '2nd', <FaMedal size={13} />, (f) => f.finalPlacement === 2),
    placementCol('third', '3rd', <FaAward size={14} />, (f) => f.finalPlacement === 3),
    placementCol('last', 'Last', <FaToilet size={14} />, isLast),
    { key: 'tiers', header: 'Tiers', align: 'right', sortValue: tiersSort, render: renderTiers },
    numCol('avgRank', 'Avg Rank', (c) => c.averageSeasonRank ?? 99, (n) => (n < 99 ? f1(n) : dash)),
  ]
}

/** Lineup-efficiency column (Sleeper era only — members without lineup data show a dash). */
function efficiencyColumn(eff: Map<string, CareerEfficiency>): Column<CareerStats> {
  return {
    key: 'eff',
    header: 'Lineup Eff',
    title: 'Started points as a % of the best possible lineup each week — Sleeper era (2021+) only',
    align: 'right',
    sortValue: (c) => eff.get(c.memberId)?.efficiency ?? 0,
    render: (c) => {
      const e = eff.get(c.memberId)
      return e ? `${(e.efficiency * 100).toFixed(1)}%` : dash
    },
  }
}

// Default left-to-right order (Team is pinned first); users can drag to a custom order on top of it.
const DEFAULT_ORDER = [
  'team', 'seasons', 'tiers', 'upr', 'avgRank', 'winpct', 'record', 'playoffRec',
  'pf', 'pa', 'diff', 'ppg', 'high', 'low', 'eff', 'titles', 'second', 'third', 'last',
]

export function buildColumns(upr: Map<string, number>, eff: Map<string, CareerEfficiency>): Column<CareerStats>[] {
  const all = [
    ...identityColumns(),
    ...scoringColumns(),
    ...finishColumns(),
    efficiencyColumn(eff),
    { key: 'upr', header: 'Avg UPR', align: 'right' as const, sortValue: (c: CareerStats) => upr.get(c.memberId) ?? 0, render: (c: CareerStats) => upr.get(c.memberId)?.toFixed(2) ?? dash },
  ]
  const byKey = new Map(all.map((c) => [c.key, c]))
  return DEFAULT_ORDER.map((k) => byKey.get(k)).filter((c): c is Column<CareerStats> => Boolean(c))
}
