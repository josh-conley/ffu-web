import { useMemo, useState } from 'react'
import { useAllDrafts, useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { getMember } from '@/config'
import { analyzeBuilds, FILTER_POSITIONS, type BuildAnalysis, type BuildStat } from '@/selectors'
import { DataTable } from '@/components/DataTable'
import { DraftBuildDetail } from '@/components/DraftBuildDetail'
import { SELECT } from '@/components/controls'
import { LEAGUE_STYLES } from '@/components/leagues'
import { posClass } from '@/components/positions'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { buildColumns } from './draftBuildColumns'

const LEAGUE_OPTIONS = [
  { value: 'ALL', label: 'All Leagues' },
  ...(['PREMIER', 'MASTERS', 'NATIONAL'] as const).map((t) => ({ value: t, label: LEAGUE_STYLES[t].label })),
]

const MIN_OPTIONS = [1, 2, 3, 5, 10]

const emptyMessage = (team: string) =>
  team
    ? 'No completed drafts for this team in the current scope.'
    : 'No builds meet the minimum team-season count. Lower “Min teams”.'

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-surface px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  )
}

/** Labeled range slider (sharp accent thumb) — shares the control aesthetic with the selects. */
function RangeSlider({ label, value, min, max, valueLabel, onChange }: { label: string; value: number; min: number; max: number; valueLabel: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex h-11 items-center gap-3 md:h-auto">
        <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="w-32 accent-accent sm:w-40" />
        <span className="w-14 shrink-0 text-sm font-bold tabular-nums">{valueLabel}</span>
      </div>
    </div>
  )
}

/** Position filter — a build only counts the checked positions, so unchecking merges buckets. */
function PositionCheckboxes({ selected, onToggle }: { selected: string[]; onToggle: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Positions counted</span>
      <div className="flex flex-wrap gap-1">
        {FILTER_POSITIONS.map((p) => {
          const on = selected.includes(p)
          return (
            <button
              key={p}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(p)}
              className={`inline-flex min-h-11 items-center gap-1.5 border px-3 py-1.5 text-sm font-bold uppercase tracking-wide md:min-h-0 ${on ? `${posClass(p)} border-transparent` : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-text'}`}
            >
              <span aria-hidden className="text-xs">{on ? '☑' : '☐'}</span>
              {p}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Option {
  value: string
  label: string
}

interface ControlsProps {
  league: string
  onLeague: (v: string) => void
  team: string
  onTeam: (v: string) => void
  teamOptions: Option[]
  threshold: number
  onThreshold: (v: string) => void
  cutoff: number
  onCutoff: (v: string) => void
  minParam: string
  onMin: (v: string) => void
  showMin: boolean
  selected: string[]
  onTogglePos: (p: string) => void
}

function Controls(props: ControlsProps) {
  const { league, onLeague, team, onTeam, teamOptions, threshold, onThreshold, cutoff, onCutoff, minParam, onMin, showMin, selected, onTogglePos } = props
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

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Team</span>
        <select className={`${SELECT} w-full sm:w-52`} value={team} onChange={(e) => onTeam(e.target.value)} aria-label="Team">
          <option value="">All Teams</option>
          {teamOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <RangeSlider label="First N rounds" value={threshold} min={1} max={12} valueLabel={`${threshold} ${threshold === 1 ? 'rd' : 'rds'}`} onChange={onThreshold} />

      <RangeSlider label="Success cutoff" value={cutoff} min={1} max={11} valueLabel={`Top ${cutoff}`} onChange={onCutoff} />

      <PositionCheckboxes selected={selected} onToggle={onTogglePos} />

      {showMin && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Min teams</span>
          <select className={`${SELECT} w-full sm:w-28`} value={minParam} onChange={(e) => onMin(e.target.value)} aria-label="Minimum team-seasons">
            {MIN_OPTIONS.map((n) => (
              <option key={n} value={n}>{`≥ ${n}`}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

function Intro({ threshold, cutoff }: { threshold: number; cutoff: number }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">Draft Analysis</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Every team's <strong className="text-text">first {threshold} {threshold === 1 ? 'round' : 'rounds'}</strong> of
        picks form a <strong className="text-text">build</strong> — its mix of the checked positions. Rows show how often
        each build <strong className="text-text">finished in the top {cutoff}</strong> (of 12 — a ~{Math.round((cutoff / 12) * 100)}% baseline),
        pooled across every completed draft. Unchecking a position ignores it (merging buckets); a traded pick counts for
        whoever made it. <strong className="text-text">Click any build</strong> to see the teams, years, and rosters behind it.
      </p>
    </div>
  )
}

function SummaryTiles({ analysis, shown }: { analysis: BuildAnalysis; shown: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Tile label="Team-seasons" value={String(analysis.totalTeams)} />
      <Tile label="Distinct builds" value={String(analysis.builds.length)} />
      <Tile label="Shown" value={String(shown)} />
    </div>
  )
}

/** Parse the `pos` URL param into a validated, canonically-ordered selection (never empty). */
function useSelectedPositions(posParam: string, setPos: (v: string) => void) {
  const selected = useMemo<string[]>(() => {
    const raw = new Set(posParam.split(',').filter((p) => (FILTER_POSITIONS as readonly string[]).includes(p)))
    const ordered = FILTER_POSITIONS.filter((p) => raw.has(p))
    return ordered.length > 0 ? [...ordered] : [...FILTER_POSITIONS]
  }, [posParam])
  const togglePos = (p: string) => {
    const next = new Set(selected)
    if (next.has(p)) next.delete(p)
    else next.add(p)
    if (next.size === 0) return // always keep at least one position selected
    setPos(FILTER_POSITIONS.filter((q) => next.has(q)).join(','))
  }
  return { selected, togglePos }
}

export function DraftAnalysis() {
  const { data: drafts, loading: draftsLoading, error: draftsError } = useAllDrafts()
  const { data: seasons, loading: seasonsLoading, error: seasonsError } = useAllSeasons()

  const [league, setLeague] = useUrlState('league', 'ALL')
  const [team, setTeam] = useUrlState('team', '')
  const [roundsParam, setRounds] = useUrlState('rounds', '3')
  const [cutoffParam, setCutoff] = useUrlState('cutoff', '6')
  const [minParam, setMin] = useUrlState('min', '3')
  const [posParam, setPos] = useUrlState('pos', FILTER_POSITIONS.join(','))
  const threshold = Number(roundsParam)
  const cutoff = Number(cutoffParam)
  const minTeams = Number(minParam)
  const { selected, togglePos } = useSelectedPositions(posParam, setPos)
  const [openKey, setOpenKey] = useState<string | undefined>(undefined)

  // Every franchise that has ever drafted, by name — the Team dropdown's options.
  const teamOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const d of drafts ?? []) for (const p of d.picks) ids.add(p.memberId)
    return [...ids]
      .map((id) => ({ value: id, label: getMember(id)?.name ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [drafts])

  // League scopes BOTH inputs (drafts for builds, seasons for finish outcomes) to that tier only;
  // Team narrows the whole sample (and its baseline) to one franchise; cutoff sets the top-N line.
  const analysis = useMemo(() => {
    if (!drafts || !seasons) return undefined
    const d = league === 'ALL' ? drafts : drafts.filter((x) => x.tier === league)
    const s = league === 'ALL' ? seasons : seasons.filter((x) => x.tier === league)
    return analyzeBuilds(d, s, threshold, selected, team ? [team] : undefined, cutoff)
  }, [drafts, seasons, league, threshold, selected, team, cutoff])

  const rows = useMemo(() => {
    if (!analysis) return []
    // A single-franchise sample is tiny, so the min-teams noise filter (and its control) drops to 1.
    const min = team ? 1 : minTeams
    return analysis.builds.filter((b) => b.teams >= min)
  }, [analysis, team, minTeams])
  const columns = useMemo(() => buildColumns(analysis?.baselinePct ?? 0.5, cutoff, openKey), [analysis?.baselinePct, cutoff, openKey])
  const toggleOpen = (b: BuildStat) => setOpenKey((k) => (k === b.key ? undefined : b.key))

  const loadError = draftsError ?? seasonsError
  if (draftsLoading || seasonsLoading) return <LoadingSpinner />
  if (loadError || !analysis) return <ErrorMessage error={loadError ?? 'No data'} />

  const openBuild = analysis.builds.find((b) => b.key === openKey)

  return (
    <div className="space-y-6">
      <Intro threshold={threshold} cutoff={cutoff} />
      <Controls league={league} onLeague={setLeague} team={team} onTeam={setTeam} teamOptions={teamOptions} threshold={threshold} onThreshold={setRounds} cutoff={cutoff} onCutoff={setCutoff} minParam={minParam} onMin={setMin} showMin={!team} selected={selected} onTogglePos={togglePos} />
      <SummaryTiles analysis={analysis} shown={rows.length} />

      {rows.length === 0 ? (
        <p className="text-muted">{emptyMessage(team)}</p>
      ) : (
        <DataTable
          key={`${league}-${team}-${threshold}-${cutoff}-${minTeams}-${posParam}`}
          columns={columns}
          rows={rows}
          getRowKey={(b) => b.key}
          initialSort={{ key: 'teams', dir: 'desc' }}
          stickyFirstColumn
          onRowClick={toggleOpen}
          selectedRowKey={openKey}
        />
      )}

      {openBuild && <DraftBuildDetail build={openBuild} threshold={threshold} cutoff={cutoff} onClose={() => setOpenKey(undefined)} />}

      <p className="text-sm text-muted">
        “Edge” is a build's top-{cutoff} rate minus the sample baseline, in percentage points — a positive edge means that
        build finished in the top {cutoff} more often than an average team, negative means less. Unfinished seasons are excluded.
      </p>
    </div>
  )
}
