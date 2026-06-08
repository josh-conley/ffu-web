import { useMemo } from 'react'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { useFilters, type FilterDef } from '@/hooks/useFilters'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { careerStats, careerUpr, type CareerStats } from '@/selectors'
import { DataTable } from '@/components/DataTable'
import { FilterBar } from '@/components/FilterBar'
import { ColumnChooser } from '@/components/ColumnChooser'
import { SELECT } from '@/components/controls'
import { LEAGUE_STYLES } from '@/components/leagues'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { buildColumns } from './allTimeColumns'

const LEAGUE_OPTIONS = [
  { value: 'ALL', label: 'All Leagues' },
  ...(['PREMIER', 'MASTERS', 'NATIONAL'] as const).map((t) => ({ value: t, label: LEAGUE_STYLES[t].label })),
]

export function AllTimeStats() {
  const { data: seasons, loading, error } = useAllSeasons()
  // League scopes the underlying seasons, so the table shows stats earned WITHIN that tier (not
  // all-time stats for anyone who happened to play it once). 'ALL' = full career across tiers.
  const [league, setLeague] = useUrlState('league', 'ALL')
  const scoped = useMemo(
    () => (seasons ? (league === 'ALL' ? seasons : seasons.filter((s) => s.tier === league)) : undefined),
    [seasons, league],
  )
  const careers = useMemo(() => (scoped ? [...careerStats(scoped).values()] : []), [scoped])
  const upr = useMemo(() => (scoped ? careerUpr(scoped) : new Map<string, number>()), [scoped])
  const columns = useMemo(() => buildColumns(upr), [upr])
  const { hidden, toggle, reset } = useColumnVisibility('leaderboard-columns')
  const visibleColumns = useMemo(() => columns.filter((c) => c.key === 'team' || !hidden.has(c.key)), [columns, hidden])
  const columnOptions = useMemo(() => columns.map((c) => ({ key: c.key, header: c.header })), [columns])

  const filterDefs = useMemo<FilterDef<CareerStats>[]>(() => {
    const maxSeasons = Math.max(1, ...careers.map((c) => c.seasons))
    return [
      // isActive is relative to the scope: "in the latest season" of the selected league (or overall).
      { key: 'active', label: 'Active only', type: 'toggle', predicate: (c) => c.isActive },
      { key: 'minSeasons', label: 'Min Seasons', type: 'range', min: 1, max: maxSeasons, predicate: (c, v) => c.seasons >= Number(v) },
    ]
  }, [careers])
  const { rows: filtered, values, setValue, clear, activeCount } = useFilters(filterDefs, careers)

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  const scopeLabel = league === 'ALL' ? 'all-time, across every league' : `within ${LEAGUE_STYLES[league as keyof typeof LEAGUE_STYLES]?.label ?? league} only`

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">All-Time Leaderboard</h1>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">League</span>
          <select className={`${SELECT} w-full sm:w-44`} value={league} onChange={(e) => setLeague(e.target.value)} aria-label="League">
            {LEAGUE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <FilterBar defs={filterDefs} values={values} onChange={setValue} onClear={clear} activeCount={activeCount} />
        <div className="ml-auto">
          <ColumnChooser options={columnOptions} hidden={hidden} onToggle={toggle} onReset={reset} locked={['team']} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted">No members match these filters.</p>
      ) : (
        <DataTable key={league + JSON.stringify(values)} columns={visibleColumns} rows={filtered} getRowKey={(c) => c.memberId} initialSort={{ key: 'upr', dir: 'desc' }} fullBleed stickyFirstColumn />
      )}
      <p className="text-sm text-muted">
        Stats are {scopeLabel}. Playoff Rec uses each season's final placement; Avg UPR is the mean of a
        member's per-season UPRs (each over its own regular-season games). Title trophies and tier counts are
        colored by league:{' '}
        <span className="font-semibold text-premier">Premier</span>, <span className="font-semibold text-masters">Masters</span>,{' '}
        <span className="font-semibold text-national">National</span>.
      </p>
    </div>
  )
}
