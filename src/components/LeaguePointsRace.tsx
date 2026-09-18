import { useMemo } from 'react'
import type { LeaguePointsRow } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { LEAGUE_STYLES } from './leagues'

/**
 * League-vs-league scoring, season to date — the other half of the newsletter's "Around the Union".
 *
 * Totals come from the same Points For the Standings page shows, so this table is always the sum of
 * that one (see selectors/aroundTheUnion.ts). Average is per team-game, which keeps the leagues
 * comparable in a week where one has played more games than another.
 */

const POINTS = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function buildColumns(): Column<LeaguePointsRow>[] {
  return [
    {
      key: 'rank',
      header: '#',
      align: 'center',
      sortValue: (r) => r.rank,
      render: (r) => <span className="font-mono font-bold tabular-nums">{r.rank}</span>,
    },
    {
      key: 'league',
      header: 'League',
      sortValue: (r) => r.rank,
      render: (r) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span aria-hidden className={`size-2.5 shrink-0 ${LEAGUE_STYLES[r.tier].dot}`} />
          <span className="font-bold">{LEAGUE_STYLES[r.tier].label}</span>
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total Points',
      align: 'right',
      title: 'Every point scored by the league this season',
      sortValue: (r) => r.totalPoints,
      render: (r) => <span className="font-mono font-semibold tabular-nums">{POINTS.format(r.totalPoints)}</span>,
    },
    {
      key: 'avg',
      header: 'Avg Game',
      align: 'right',
      title: 'Points per team-game',
      sortValue: (r) => r.averageGame,
      render: (r) => <span className="font-mono tabular-nums">{r.averageGame.toFixed(2)}</span>,
    },
  ]
}

export function LeaguePointsRace({ rows }: { rows: LeaguePointsRow[] }) {
  const columns = useMemo(() => buildColumns(), [])
  if (rows.length === 0) {
    return <p className="border border-dashed border-border bg-surface/60 p-4 text-sm text-muted">No games played yet this season.</p>
  }
  return <DataTable columns={columns} rows={rows} getRowKey={(r) => r.tier} initialSort={{ key: 'rank', dir: 'asc' }} />
}
