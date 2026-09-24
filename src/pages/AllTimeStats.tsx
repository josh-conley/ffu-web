import { useMemo } from 'react'
import { FaArrowsLeftRight } from 'react-icons/fa6'
import { useAllTimeStats } from '@/hooks/useAllTimeStats'
import { useUrlState } from '@/hooks/useUrlState'
import { useFilters, type FilterDef } from '@/hooks/useFilters'
import { useManagedColumns } from '@/hooks/useManagedColumns'
import type { CareerStats } from '@/selectors'
import { DataTable } from '@/components/DataTable'
import { FilterBar } from '@/components/FilterBar'
import { StatDefs } from '@/components/StatDefs'
import { ColumnChooser } from '@/components/ColumnChooser'
import { SELECT, segButton } from '@/components/controls'
import { LEAGUE_STYLES } from '@/components/leagues'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { buildColumns } from './allTimeColumns'

const LEAGUE_OPTIONS = [
  { value: 'ALL', label: 'All Leagues' },
  ...(['PREMIER', 'MASTERS', 'NATIONAL'] as const).map((t) => ({ value: t, label: LEAGUE_STYLES[t].label })),
]

const REORDER_HINT = (
  <p className="flex items-center gap-1.5 text-xs text-muted">
    <FaArrowsLeftRight className="shrink-0 text-accent" aria-hidden />
    Drag the column headers to reorder them, and use the <strong className="text-text">Columns</strong> button to show or hide any column.
  </p>
)

const EFFICIENCY_DEFS = (
  <StatDefs
    items={[
      { term: 'Lineup Eff', def: 'Points the started lineups actually scored as a share of the best possible score from the full roster each week. 100% = fielded the optimal lineup every single week.' },
    ]}
    note="Computed from weekly Sleeper lineup data, which exists only for 2021 onward — ESPN-era careers (2018–2020) show a dash."
  />
)

/** Whether anything (scope, filters, columns) has been customized from the defaults. */
const hasCustomizations = (p: { activeCount: number; orderCustomized: boolean; hiddenCount: number; league: string }) =>
  p.activeCount > 0 || p.orderCustomized || p.hiddenCount > 0 || p.league !== 'ALL'

export function AllTimeStats() {
  // League scopes the underlying seasons (see useAllTimeStats). 'ALL' = full career across tiers.
  const [league, setLeague] = useUrlState('league', 'ALL')
  const { loaded, careers, active, upr, eff, winnings, loading, error } = useAllTimeStats(league)
  const columns = useMemo(() => buildColumns(upr, eff, winnings), [upr, eff, winnings])
  // Team stays pinned first; every other column is drag-reorderable + show/hide-able (both persisted).
  const { visible: visibleColumns, options: columnOptions, hidden, toggle, resetVisibility, hideAll, onReorder, resetOrder, orderCustomized } = useManagedColumns(columns, 'team', 'stats-columns')

  const filterDefs = useMemo<FilterDef<CareerStats>[]>(() => {
    const maxSeasons = Math.max(1, ...careers.map((c) => c.seasons))
    return [
      // A current member of the union, whatever the scope: from the FULL season set, not `scoped`.
      { key: 'active', label: 'Active only', type: 'toggle', predicate: (c) => active.has(c.memberId) },
      { key: 'minSeasons', label: 'Min Seasons', type: 'range', min: 1, max: maxSeasons, predicate: (c, v) => c.seasons >= Number(v) },
    ]
  }, [careers, active])
  const { rows: filtered, values, setValue, clear, activeCount } = useFilters(filterDefs, careers)

  // One control to restore defaults: league scope, filters (active + slider), column show/hide + order.
  const dirty = hasCustomizations({ activeCount, orderCustomized, hiddenCount: hidden.size, league })
  const resetAll = () => { setLeague('ALL'); clear(); resetVisibility(); resetOrder() }

  if (loading) return <LoadingSpinner />
  if (error || !loaded) return <ErrorMessage error={error ?? 'No data'} />

  const scopeLabel = league === 'ALL' ? 'all-time, across every league' : `within ${LEAGUE_STYLES[league as keyof typeof LEAGUE_STYLES]?.label ?? league} only`

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">All-Time Stats</h1>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">League</span>
          <select className={`${SELECT} w-full sm:w-44`} value={league} onChange={(e) => setLeague(e.target.value)} aria-label="League">
            {LEAGUE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <FilterBar defs={filterDefs} values={values} onChange={setValue} onClear={clear} activeCount={activeCount} showClear={false} />
        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <button type="button" onClick={resetAll} className={segButton(false)}>
              Reset all
            </button>
          )}
          <ColumnChooser options={columnOptions} hidden={hidden} onToggle={toggle} onReset={resetVisibility} onHideAll={hideAll} onResetOrder={resetOrder} orderCustomized={orderCustomized} locked={['team']} />
        </div>
      </div>
      {REORDER_HINT}
      {filtered.length === 0 ? (
        <p className="text-muted">No members match these filters.</p>
      ) : (
        <DataTable
          key={league + JSON.stringify(values)}
          columns={visibleColumns}
          rows={filtered}
          getRowKey={(c) => c.memberId}
          initialSort={{ key: 'upr', dir: 'desc' }}
          fullBleed
          stickyFirstColumn
          reorder={{ lockedKey: 'team', onReorder }}
        />
      )}
      {EFFICIENCY_DEFS}
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
