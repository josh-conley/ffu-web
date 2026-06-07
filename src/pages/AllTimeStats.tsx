import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMember } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { useFilters, type FilterDef } from '@/hooks/useFilters'
import { careerStats, careerUpr, championshipTitles, type CareerStats } from '@/selectors'
import { DataTable, type Column } from '@/components/DataTable'
import { FilterBar } from '@/components/FilterBar'
import { SELECT } from '@/components/controls'
import { LEAGUE_STYLES } from '@/components/leagues'
import { TierDots, Trophies } from '@/components/Trophies'
import { TeamLogo } from '@/components/TeamLogo'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const LEAGUE_OPTIONS = [
  { value: 'ALL', label: 'All Leagues' },
  ...(['PREMIER', 'MASTERS', 'NATIONAL'] as const).map((t) => ({ value: t, label: LEAGUE_STYLES[t].label })),
]

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
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted">No members match these filters.</p>
      ) : (
        <DataTable key={league + JSON.stringify(values)} columns={columns} rows={filtered} getRowKey={(c) => c.memberId} initialSort={{ key: 'upr', dir: 'desc' }} />
      )}
      <p className="text-sm text-muted">
        Stats are {scopeLabel}. Career UPR applies the season UPR formula over each member's regular-season
        history; trophies and dots are colored by league:{' '}
        <span className="font-semibold text-premier">Premier</span>, <span className="font-semibold text-masters">Masters</span>,{' '}
        <span className="font-semibold text-national">National</span>.
      </p>
    </div>
  )
}
