import { useMemo } from 'react'
import { useAllDrafts, useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { analyzeBuilds } from '@/selectors'
import { DataTable } from '@/components/DataTable'
import { SELECT, segButton } from '@/components/controls'
import { LEAGUE_STYLES } from '@/components/leagues'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { buildColumns } from './draftBuildColumns'

const LEAGUE_OPTIONS = [
  { value: 'ALL', label: 'All Leagues' },
  ...(['PREMIER', 'MASTERS', 'NATIONAL'] as const).map((t) => ({ value: t, label: LEAGUE_STYLES[t].label })),
]

// First-N-round thresholds. Capped at 8: beyond that nearly every team has drafted all four skill
// positions, so builds stop discriminating. The two the user reasons about (3, 4) sit in the middle.
const THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8] as const
const MIN_OPTIONS = [1, 2, 3, 5, 10]

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-surface px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  )
}

interface ControlsProps {
  league: string
  onLeague: (v: string) => void
  threshold: number
  onThreshold: (v: string) => void
  minParam: string
  onMin: (v: string) => void
}

function Controls({ league, onLeague, threshold, onThreshold, minParam, onMin }: ControlsProps) {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">League</span>
        <select className={`${SELECT} w-full sm:w-44`} value={league} onChange={(e) => onLeague(e.target.value)} aria-label="League">
          {LEAGUE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">First N rounds</span>
        <div className="flex flex-wrap gap-1">
          {THRESHOLDS.map((n) => (
            <button key={n} type="button" onClick={() => onThreshold(String(n))} aria-pressed={n === threshold} className={segButton(n === threshold)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Min teams</span>
        <select className={`${SELECT} w-full sm:w-28`} value={minParam} onChange={(e) => onMin(e.target.value)} aria-label="Minimum team-seasons">
          {MIN_OPTIONS.map((n) => (
            <option key={n} value={n}>{`≥ ${n}`}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function DraftAnalysis() {
  const { data: drafts, loading: draftsLoading, error: draftsError } = useAllDrafts()
  const { data: seasons, loading: seasonsLoading, error: seasonsError } = useAllSeasons()

  const [league, setLeague] = useUrlState('league', 'ALL')
  const [roundsParam, setRounds] = useUrlState('rounds', '3')
  const [minParam, setMin] = useUrlState('min', '3')
  const threshold = Number(roundsParam)
  const minTeams = Number(minParam)

  // League scopes BOTH inputs (drafts for builds, seasons for playoff outcomes) to that tier only.
  const analysis = useMemo(() => {
    if (!drafts || !seasons) return undefined
    const d = league === 'ALL' ? drafts : drafts.filter((x) => x.tier === league)
    const s = league === 'ALL' ? seasons : seasons.filter((x) => x.tier === league)
    return analyzeBuilds(d, s, threshold)
  }, [drafts, seasons, league, threshold])

  const rows = useMemo(
    () => (analysis ? analysis.builds.filter((b) => b.teams >= minTeams) : []),
    [analysis, minTeams],
  )
  const columns = useMemo(() => buildColumns(analysis?.baselinePct ?? 0.5), [analysis?.baselinePct])

  if (draftsLoading || seasonsLoading) return <LoadingSpinner />
  if (draftsError || seasonsError || !analysis) return <ErrorMessage error={draftsError ?? seasonsError ?? 'No data'} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Draft Analysis</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Every team's <strong className="text-text">first {threshold} {threshold === 1 ? 'round' : 'rounds'}</strong> of
          picks form a <strong className="text-text">build</strong> — its position mix. Rows show how often each build
          reached the championship bracket (the top 6 of 12 — a ~50% baseline), pooled across every completed draft.
          A traded pick counts for whoever made it.
        </p>
      </div>

      <Controls league={league} onLeague={setLeague} threshold={threshold} onThreshold={setRounds} minParam={minParam} onMin={setMin} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Team-seasons" value={String(analysis.totalTeams)} />
        <Tile label="Baseline rate" value={`${Math.round(analysis.baselinePct * 100)}%`} />
        <Tile label="Distinct builds" value={String(analysis.builds.length)} />
        <Tile label="Shown" value={String(rows.length)} />
      </div>

      {rows.length === 0 ? (
        <p className="text-muted">No builds meet the minimum team-season count. Lower “Min teams”.</p>
      ) : (
        <DataTable
          key={`${league}-${threshold}-${minTeams}`}
          columns={columns}
          rows={rows}
          getRowKey={(b) => b.key}
          initialSort={{ key: 'teams', dir: 'desc' }}
          stickyFirstColumn
        />
      )}

      <p className="text-sm text-muted">
        “Edge” is a build's playoff rate minus the sample baseline, in percentage points — a positive edge means that
        build reached the playoffs more often than an average team, negative means less. Unfinished seasons are excluded.
      </p>
    </div>
  )
}
