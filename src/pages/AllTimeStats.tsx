import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMember } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { careerStats, careerUpr, type CareerStats } from '@/selectors'
import { DataTable, type Column } from '@/components/DataTable'
import { TeamLogo } from '@/components/TeamLogo'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

function buildColumns(upr: Map<string, number>): Column<CareerStats>[] {
  return [
    {
      key: 'team',
      header: 'Team',
      sortValue: (c) => getMember(c.memberId)?.name ?? c.memberId,
      render: (c) => (
        <Link to={`/members?member=${c.memberId}`} className="flex items-center gap-2 hover:underline">
          <TeamLogo ffuId={c.memberId} size={22} />
          <span className="font-medium">{getMember(c.memberId)?.name ?? c.memberId}</span>
        </Link>
      ),
    },
    { key: 'seasons', header: 'Seasons', align: 'right', sortValue: (c) => c.seasons, render: (c) => c.seasons },
    { key: 'record', header: 'Record', align: 'right', render: (c) => `${c.wins}-${c.losses}${c.ties > 0 ? `-${c.ties}` : ''}` },
    { key: 'winpct', header: 'Win%', align: 'right', sortValue: (c) => c.winPct, render: (c) => `${(c.winPct * 100).toFixed(1)}%` },
    { key: 'pf', header: 'Points For', align: 'right', sortValue: (c) => c.pointsFor, render: (c) => c.pointsFor.toFixed(1) },
    { key: 'titles', header: 'Titles', align: 'right', sortValue: (c) => c.championships, render: (c) => c.championships || '—' },
    { key: 'playoffs', header: 'Playoff Apps', align: 'right', sortValue: (c) => c.playoffAppearances, render: (c) => c.playoffAppearances },
    { key: 'upr', header: 'Career UPR', align: 'right', sortValue: (c) => upr.get(c.memberId) ?? 0, render: (c) => upr.get(c.memberId)?.toFixed(2) ?? '—' },
  ]
}

export function AllTimeStats() {
  const { data: seasons, loading, error } = useAllSeasons()
  const careers = useMemo(() => (seasons ? [...careerStats(seasons).values()] : []), [seasons])
  const upr = useMemo(() => (seasons ? careerUpr(seasons) : new Map<string, number>()), [seasons])
  const columns = useMemo(() => buildColumns(upr), [upr])

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">All-Time Stats</h1>
      <DataTable columns={columns} rows={careers} getRowKey={(c) => c.memberId} initialSort={{ key: 'upr', dir: 'desc' }} />
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Career UPR applies the season UPR formula over each member's entire regular-season history.
      </p>
    </div>
  )
}
