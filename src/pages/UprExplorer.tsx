import { useMemo } from 'react'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { liveUprStatus, longestRegularSeason, rankUprRows, uprThroughWeekRows } from '@/selectors'
import { DataTable } from '@/components/DataTable'
import { ErrorMessage } from '@/components/ErrorMessage'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { UprExplorerControls } from './UprExplorerControls'
import { UprLiveCallout } from './UprLiveCallout'
import { UPR_EXPLORER_COLUMNS } from './uprExplorerColumns'
import { useUprExplorerState } from './uprExplorerState'

function Intro() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">UPR Explorer</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Every team-season's <strong className="text-text">UPR as it stood after the week you choose</strong>, ranked
        against every other at the same point: the best team through week 8, the worst start, the best ever. Each
        rating counts the regular-season games from week 1 through that week.
      </p>
    </div>
  )
}

export function UprExplorer() {
  const { data: seasons, loading, error } = useAllSeasons()
  const all = useMemo(() => seasons ?? [], [seasons])
  const years = useMemo(() => [...new Set(all.map((s) => s.year))].sort(), [all])
  const maxWeek = longestRegularSeason(all)
  const memberIds = useMemo(() => [...new Set(all.flatMap((s) => s.teams.map((t) => t.memberId)))], [all])
  const state = useUprExplorerState(years, maxWeek)
  const { week, league, member, order, yearRange } = state

  // The ranking covers the whole scope (league + years); the member filter only picks rows from it.
  const scoped = useMemo(
    () => all.filter((s) => (league === 'ALL' || s.tier === league) && s.year >= yearRange.fromYear && s.year <= yearRange.toYear),
    [all, league, yearRange.fromYear, yearRange.toYear],
  )
  const ranked = useMemo(() => rankUprRows(uprThroughWeekRows(scoped, week), order === 'low'), [scoped, week, order])
  const rows = useMemo(() => (member ? ranked.filter((r) => r.memberId === member) : ranked), [ranked, member])
  const live = useMemo(() => liveUprStatus(scoped, ranked, week), [scoped, ranked, week])

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-6">
      <Intro />
      <UprExplorerControls state={state} years={years} maxWeek={maxWeek} memberIds={memberIds} />
      {live && <UprLiveCallout status={live} order={order} week={week} onWeek={state.setWeek} />}
      {rows.length === 0 ? (
        <p className="text-muted">{member ? 'That member has no rated team-season in this range.' : 'No team-seasons are rated in this range.'}</p>
      ) : (
        <DataTable
          key={`${week}-${league}-${member}-${order}-${yearRange.fromYear}-${yearRange.toYear}`}
          columns={UPR_EXPLORER_COLUMNS}
          rows={rows}
          getRowKey={(r) => r.key}
          initialSort={{ key: 'team', dir: 'asc' }}
          pageSize={50}
          stickyFirstColumn
        />
      )}
    </div>
  )
}
