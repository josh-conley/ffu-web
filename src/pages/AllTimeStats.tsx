import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMember } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useFilters, type FilterDef } from '@/hooks/useFilters'
import { careerStats, careerUpr, championshipTitles, type CareerStats } from '@/selectors'
import { DataTable, type Column } from '@/components/DataTable'
import { FilterBar } from '@/components/FilterBar'
import { LEAGUE_STYLES } from '@/components/leagues'
import { TierDots, Trophies } from '@/components/Trophies'
import { TeamLogo } from '@/components/TeamLogo'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const TIER_OPTIONS = (['PREMIER', 'MASTERS', 'NATIONAL'] as const).map((t) => ({ value: t, label: LEAGUE_STYLES[t].label }))

function buildColumns(upr: Map<string, number>): Column<CareerStats>[] {
  return [
    {
      key: 'team',
      header: 'Team',
      sortValue: (c) => getMember(c.memberId)?.name ?? c.memberId,
      render: (c) => (
        <Link to={`/members?member=${c.memberId}`} className="flex items-center gap-2 rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <TeamLogo ffuId={c.memberId} size={22} />
          <span className="font-medium">{getMember(c.memberId)?.name ?? c.memberId}</span>
        </Link>
      ),
    },
    { key: 'seasons', header: 'Seasons', align: 'right', sortValue: (c) => c.seasons, render: (c) => c.seasons },
    { key: 'record', header: 'Record', align: 'right', render: (c) => `${c.wins}-${c.losses}${c.ties > 0 ? `-${c.ties}` : ''}` },
    { key: 'winpct', header: 'Win%', align: 'right', sortValue: (c) => c.winPct, render: (c) => `${(c.winPct * 100).toFixed(1)}%` },
    { key: 'pf', header: 'Points For', align: 'right', sortValue: (c) => c.pointsFor, render: (c) => c.pointsFor.toFixed(1) },
    {
      key: 'titles',
      header: 'Titles',
      align: 'right',
      sortValue: (c) => c.championships,
      render: (c) =>
        c.championships > 0 ? (
          <span className="flex justify-end">
            <Trophies titles={championshipTitles(c)} />
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'playoffs',
      header: 'Playoff Apps',
      align: 'right',
      sortValue: (c) => c.playoffAppearances,
      render: (c) =>
        c.playoffAppearances > 0 ? (
          <span className="inline-flex items-center justify-end gap-1.5">
            <span className="tabular-nums">{c.playoffAppearances}</span>
            <TierDots tiers={c.playoffTiers} />
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: 'upr', header: 'Career UPR', align: 'right', sortValue: (c) => upr.get(c.memberId) ?? 0, render: (c) => upr.get(c.memberId)?.toFixed(2) ?? '—' },
  ]
}

export function AllTimeStats() {
  const { data: seasons, loading, error } = useAllSeasons()
  const careers = useMemo(() => (seasons ? [...careerStats(seasons).values()] : []), [seasons])
  const upr = useMemo(() => (seasons ? careerUpr(seasons) : new Map<string, number>()), [seasons])
  const columns = useMemo(() => buildColumns(upr), [upr])

  const filterDefs = useMemo<FilterDef<CareerStats>[]>(() => {
    const maxSeasons = Math.max(1, ...careers.map((c) => c.seasons))
    const maxTitles = Math.max(1, ...careers.map((c) => c.championships))
    return [
      { key: 'league', label: 'Played In', options: TIER_OPTIONS, predicate: (c, v) => c.finishes.some((f) => f.tier === v) },
      { key: 'minSeasons', label: 'Min Seasons', type: 'range', min: 1, max: maxSeasons, predicate: (c, v) => c.seasons >= Number(v) },
      { key: 'minTitles', label: 'Min Titles', type: 'range', min: 0, max: maxTitles, predicate: (c, v) => c.championships >= Number(v) },
    ]
  }, [careers])
  const { rows: filtered, values, setValue, clear, activeCount } = useFilters(filterDefs, careers)

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">All-Time Leaderboard</h1>
      <FilterBar defs={filterDefs} values={values} onChange={setValue} onClear={clear} activeCount={activeCount} />
      {filtered.length === 0 ? (
        <p className="text-muted">No members match these filters.</p>
      ) : (
        <DataTable key={JSON.stringify(values)} columns={columns} rows={filtered} getRowKey={(c) => c.memberId} initialSort={{ key: 'upr', dir: 'desc' }} />
      )}
      <p className="text-sm text-muted">
        Career UPR applies the season UPR formula over each member's entire regular-season history. Trophies and
        dots are colored by league: <span className="font-semibold text-premier">Premier</span>,{' '}
        <span className="font-semibold text-masters">Masters</span>, <span className="font-semibold text-national">National</span>.
      </p>
    </div>
  )
}
