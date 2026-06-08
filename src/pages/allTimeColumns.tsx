import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getMember } from '@/config'
import type { Tier } from '@/config/types'
import { championshipTitles, type CareerStats } from '@/selectors'
import type { Column } from '@/components/DataTable'
import { LEAGUE_STYLES } from '@/components/leagues'
import { Trophies } from '@/components/Trophies'
import { TeamLogo } from '@/components/TeamLogo'

// Column definitions for the All-Time Leaderboard, mirroring the old site's Career Statistics
// table. Split into small group builders to stay within the file/function line caps; the page
// just composes them. Tier colors come only from LEAGUE_STYLES (DRY).

const games = (c: CareerStats) => c.wins + c.losses + c.ties
const dash = <span className="text-muted">—</span>
const f1 = (n: number) => n.toFixed(1)
const count = (n: number): ReactNode => (n > 0 ? n : dash)

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
      render: (c) => (
        <Link to={`/members?member=${c.memberId}`} className="flex items-center gap-2 rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <TeamLogo ffuId={c.memberId} size={22} />
          <span className="font-medium whitespace-nowrap">{getMember(c.memberId)?.name ?? c.memberId}</span>
        </Link>
      ),
    },
    numCol('seasons', 'Seasons', (c) => c.seasons),
    { key: 'record', header: 'Record', align: 'right', sortValue: (c) => c.wins, render: (c) => `${c.wins}-${c.losses}${c.ties > 0 ? `-${c.ties}` : ''}` },
    numCol('winpct', 'Win%', (c) => c.winPct, (n) => `${(n * 100).toFixed(1)}%`),
    { key: 'playoffRec', header: 'Playoff Rec', align: 'right', sortValue: (c) => c.playoffWins, render: (c) => (c.playoffWins || c.playoffLosses ? `${c.playoffWins}-${c.playoffLosses}` : dash) },
  ]
}

function scoringColumns(): Column<CareerStats>[] {
  return [
    numCol('pf', 'Points For', (c) => c.pointsFor, f1),
    numCol('pa', 'Points Agst', (c) => c.pointsAgainst, f1),
    numCol('diff', 'Point Diff', (c) => c.pointsFor - c.pointsAgainst, (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`),
    numCol('ppg', 'Avg PPG', (c) => (games(c) ? c.pointsFor / games(c) : 0), f1),
    numCol('high', 'High Game', (c) => c.careerHighGame ?? 0, (n) => (n ? f1(n) : dash)),
    numCol('low', 'Low Game', (c) => c.careerLowGame ?? 0, (n) => (n ? f1(n) : dash)),
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

function finishColumns(): Column<CareerStats>[] {
  return [
    {
      key: 'titles',
      header: 'Titles',
      align: 'right',
      sortValue: (c) => c.championships,
      render: (c) => (c.championships > 0 ? <span className="flex justify-end"><Trophies titles={championshipTitles(c)} /></span> : dash),
    },
    numCol('second', '2nd', (c) => c.runnerUps, count),
    numCol('third', '3rd', (c) => c.thirdPlaceFinishes, count),
    numCol('last', 'Last', (c) => c.lastPlaceFinishes, count),
    { key: 'tiers', header: 'Tiers', align: 'right', sortValue: (c) => c.premierSeasons, render: renderTiers },
    numCol('avgRank', 'Avg Rank', (c) => c.averageSeasonRank ?? 99, (n) => (n < 99 ? f1(n) : dash)),
  ]
}

export function buildColumns(upr: Map<string, number>): Column<CareerStats>[] {
  return [
    ...identityColumns(),
    ...scoringColumns(),
    ...finishColumns(),
    { key: 'upr', header: 'Avg UPR', align: 'right', sortValue: (c) => upr.get(c.memberId) ?? 0, render: (c) => upr.get(c.memberId)?.toFixed(2) ?? dash },
  ]
}
