import { useMemo } from 'react'
import { nameForYear } from '@/config'
import type { UnionStandingRow } from '@/selectors'
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
function buildColumns(year: string): Column<UnionStandingRow>[] {
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
      header: 'Rank',
      title: 'Placement across all three leagues, by UPR',
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
          <span className="font-semibold whitespace-nowrap">{nameForYear(r.team.memberId, year) ?? r.team.memberId}</span>
        </span>
      ),
    },
    {
      key: 'league',
      header: 'League',
      // Sorted in prestige order (Premier → National), which is what a reader means by "by league".
      sortValue: (r) => TIER_PRESTIGE.indexOf(r.tier),
      render: (r) => <LeagueBadge tier={r.tier} />,
    },
    num('leagueRank', 'In Lg', (r) => r.leagueRank, (n) => String(n), 'Placement within its own league'),
    { key: 'record', header: 'Record', sortValue: (r) => r.winPct, render: (r) => recordLabel(r.team.record) },
    num('pf', 'PF', (r) => r.team.points.for, (n) => n.toFixed(2), 'Points For'),
    num('pa', 'PA', (r) => r.team.points.against, (n) => n.toFixed(2), 'Points Against'),
    num('upr', 'UPR', (r) => r.upr, (n) => (n ? n.toFixed(2) : '—'), 'Union Power Ranking — the cross-league rating'),
  ]
}

export function UnionStandingsTable({ rows, year }: { rows: UnionStandingRow[]; year: string }) {
  const columns = useMemo(() => buildColumns(year), [year])
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.team.memberId}
      initialSort={{ key: 'rank', dir: 'asc' }}
    />
  )
}
