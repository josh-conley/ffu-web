import { useMemo } from 'react'
import { nameForYear } from '@/config'
import { rankedByUpr, type UnionStandingRow } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { recordLabel } from './format'
import { LeagueBadge } from './LeagueBadge'
import { TIER_PRESTIGE } from './leagues'
import { TeamLogo } from './TeamLogo'

/**
 * The Union view: one year's 36 teams in a single table.
 *
 * Sibling of StandingsTable rather than a mode of it — the columns differ (a league, and the rank
 * that league gives the team) and the default order is UPR, not placement. Keeping them apart beats
 * threading a flag through the one that every league page renders.
 */
function buildColumns(year: string, byUpr: boolean): Column<UnionStandingRow>[] {
  const num = (
    key: string,
    header: string,
    get: (r: UnionStandingRow) => number,
    fmt: (n: number) => string,
    title?: string,
  ): Column<UnionStandingRow> => ({ key, header, align: 'right', title, sortValue: get, render: (r) => fmt(get(r)) })

  return [
    {
      key: 'rank',
      header: '#',
      align: 'right',
      title: byUpr ? 'Placement across all three leagues, by UPR' : 'Placement across all three leagues, by record',
      sortValue: (r) => r.rank,
      render: (r) => <span className="font-semibold">{r.rank}</span>,
    },
    {
      key: 'team',
      header: 'Team',
      sortValue: (r) => nameForYear(r.team.memberId, year) ?? r.team.memberId,
      render: (r) => (
        <span className="flex items-center gap-2">
          <TeamLogo ffuId={r.team.memberId} />
          <span className="font-semibold max-sm:max-w-36 sm:whitespace-nowrap">{nameForYear(r.team.memberId, year) ?? r.team.memberId}</span>
        </span>
      ),
    },
    {
      key: 'league',
      header: 'League',
      title: "The team's league, and its placement in that league's own table",
      // Prestige order (Premier → National) then placement inside the league — what a reader means
      // by "sort by league". The placement rides in the badge rather than taking a column of its
      // own: it only has meaning next to the league it belongs to.
      sortValue: (r) => TIER_PRESTIGE.indexOf(r.tier) * 100 + r.leagueRank,
      render: (r) => <LeagueBadge tier={r.tier} rank={r.leagueRank} />,
    },
    { key: 'record', header: 'Record', sortValue: (r) => r.winPct, render: (r) => recordLabel(r.team.record) },
    num('pf', 'PF', (r) => r.team.points.for, (n) => n.toFixed(2), 'Points For'),
    num('pa', 'PA', (r) => r.team.points.against, (n) => n.toFixed(2), 'Points Against'),
    ...(byUpr
      ? [num('upr', 'UPR', (r) => r.upr, (n) => (n ? n.toFixed(2) : '—'), 'Union Power Ranking — the cross-league rating')]
      : []),
  ]
}

export function UnionStandingsTable({ rows, year }: { rows: UnionStandingRow[]; year: string }) {
  const byUpr = rankedByUpr(rows)
  const columns = useMemo(() => buildColumns(year, byUpr), [year, byUpr])
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.team.memberId}
      initialSort={{ key: 'rank', dir: 'asc' }}
    />
  )
}
