import type { ManagerStint, PlayerSeasonRow } from '@/selectors'
import { DataTable, type Column } from '../DataTable'
import { LeagueBadge } from '../LeagueBadge'
import { TeamCell } from '../TeamCell'

const pts = (n: number) => <span className="font-mono tabular-nums">{n.toFixed(2)}</span>
const count = (n: number) => <span className="font-mono tabular-nums">{n}</span>

const MANAGER_COLUMNS: Column<ManagerStint>[] = [
  { key: 'team', header: 'Team', render: (r) => <TeamCell ffuId={r.memberId} />, sortValue: (r) => r.memberId },
  { key: 'years', header: 'Seasons', render: (r) => r.years.join(', '), sortValue: (r) => r.years[0] ?? '' },
  { key: 'points', header: 'Pts', title: 'Points he scored for this team while started', align: 'right', render: (r) => pts(r.points), sortValue: (r) => r.points },
  { key: 'starts', header: 'Starts', align: 'right', render: (r) => count(r.starts), sortValue: (r) => r.starts },
  { key: 'bench', header: 'Bench', title: 'Weeks rostered but not started', align: 'right', render: (r) => count(r.benchWeeks), sortValue: (r) => r.benchWeeks },
  { key: 'avg', header: 'Avg', title: 'Points per start', align: 'right', render: (r) => pts(r.starts > 0 ? r.points / r.starts : 0), sortValue: (r) => (r.starts > 0 ? r.points / r.starts : 0) },
  { key: 'best', header: 'Best', align: 'right', render: (r) => pts(r.best), sortValue: (r) => r.best },
]

/** Every FFU team that rostered him, most points scored for them first. */
export function PlayerManagersTable({ rows }: { rows: ManagerStint[] }) {
  return <DataTable columns={MANAGER_COLUMNS} rows={rows} getRowKey={(r) => r.memberId} stickyFirstColumn />
}

const SEASON_COLUMNS: Column<PlayerSeasonRow>[] = [
  { key: 'year', header: 'Year', render: (r) => r.year, sortValue: (r) => r.year },
  { key: 'league', header: 'League', render: (r) => <LeagueBadge tier={r.tier} /> },
  { key: 'team', header: 'Team', render: (r) => <TeamCell ffuId={r.memberId} year={r.year} /> },
  { key: 'points', header: 'Pts', align: 'right', render: (r) => pts(r.points), sortValue: (r) => r.points },
  { key: 'starts', header: 'Starts', align: 'right', render: (r) => count(r.starts), sortValue: (r) => r.starts },
  { key: 'bench', header: 'Bench', title: 'Weeks rostered but not started', align: 'right', render: (r) => count(r.benchWeeks), sortValue: (r) => r.benchWeeks },
]

/**
 * Season by season, one row per team he was on — a player traded mid-season appears once for each
 * side. Newest first.
 */
export function PlayerSeasonsTable({ rows }: { rows: PlayerSeasonRow[] }) {
  return <DataTable columns={SEASON_COLUMNS} rows={rows} getRowKey={(r) => `${r.year}-${r.tier}-${r.memberId}`} />
}
