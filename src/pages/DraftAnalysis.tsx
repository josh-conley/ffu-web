import { useMemo, useState } from 'react'
import { useAllDrafts, useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { getMember } from '@/config'
import { analyzeBuilds, FILTER_POSITIONS, type BuildStat } from '@/selectors'
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

const EMPTY_BASELINES = { first: 0, top3: 0, top6: 0, top9: 0 }

const emptyMessage = (team: string) =>
  team
    ? 'No completed drafts for this team in the current scope.'
    : 'No builds meet the minimum team-season count. Lower “Min teams”.'

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

/** Draft-slot filter — keep only teams that picked from the checked draft-order positions. */
function SlotCheckboxes({ allSlots, selected, onToggle }: { allSlots: number[]; selected: Set<number>; onToggle: (n: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Draft slot</span>
      <div className="flex flex-wrap gap-1">
        {allSlots.map((n) => {
          const on = selected.has(n)
          return (
            <button
              key={n}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={`Draft slot ${n}`}
              onClick={() => onToggle(n)}
              className={`inline-flex h-9 w-9 items-center justify-center border text-sm font-bold tabular-nums ${on ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-text'}`}
            >
              {n}
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
  minParam: string
  onMin: (v: string) => void
  showMin: boolean
  selected: string[]
  onTogglePos: (p: string) => void
  allSlots: number[]
  selectedSlots: Set<number>
  onToggleSlot: (n: number) => void
}

function Controls(props: ControlsProps) {
  const { league, onLeague, team, onTeam, teamOptions, threshold, onThreshold, minParam, onMin, showMin, selected, onTogglePos, allSlots, selectedSlots, onToggleSlot } = props
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

      <PositionCheckboxes selected={selected} onToggle={onTogglePos} />

      <SlotCheckboxes allSlots={allSlots} selected={selectedSlots} onToggle={onToggleSlot} />

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

function Intro({ threshold, totalTeams }: { threshold: number; totalTeams: number }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">Draft Analysis</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Every team's <strong className="text-text">first {threshold} {threshold === 1 ? 'round' : 'rounds'}</strong> of
        picks form a <strong className="text-text">build</strong> — its mix of the checked positions. Each column is a{' '}
        <strong className="text-text">finish bracket</strong> — how often that build ended up 1st, top 3, top 6, or
        top 9 — pooled across <strong className="text-text">{totalTeams} team-seasons</strong>.{' '}
        <strong className="text-text">Click any build</strong> to see the teams, years, and rosters behind it.
      </p>
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

/** Draft-slot selection from the `slots` URL param — empty/all means "no filter" (all slots checked). */
function useSelectedSlots(slotsParam: string, setSlots: (v: string) => void, maxSlot: number) {
  const allSlots = useMemo(() => Array.from({ length: maxSlot }, (_, i) => i + 1), [maxSlot])
  const selected = useMemo(() => {
    const parsed = slotsParam.split(',').map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= maxSlot)
    return parsed.length > 0 ? new Set(parsed) : new Set(allSlots)
  }, [slotsParam, maxSlot, allSlots])
  const toggleSlot = (n: number) => {
    const next = new Set(selected)
    if (next.has(n)) next.delete(n)
    else next.add(n)
    if (next.size === 0) return // keep at least one slot selected
    setSlots(next.size === maxSlot ? '' : [...next].sort((a, b) => a - b).join(','))
  }
  // `slots` for the selector: undefined when everything is selected (no filtering needed). Memoized
  // so the analysis memo isn't invalidated every render by a fresh array.
  const slotFilter = useMemo(() => (selected.size === maxSlot ? undefined : [...selected]), [selected, maxSlot])
  return { allSlots, selected, toggleSlot, slotFilter }
}

export function DraftAnalysis() {
  const { data: drafts, loading: draftsLoading, error: draftsError } = useAllDrafts()
  const { data: seasons, loading: seasonsLoading, error: seasonsError } = useAllSeasons()

  const [league, setLeague] = useUrlState('league', 'ALL')
  const [team, setTeam] = useUrlState('team', '')
  const [roundsParam, setRounds] = useUrlState('rounds', '3')
  const [minParam, setMin] = useUrlState('min', '3')
  const [posParam, setPos] = useUrlState('pos', FILTER_POSITIONS.join(','))
  const [slotsParam, setSlots] = useUrlState('slots', '')
  const threshold = Number(roundsParam)
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

  const maxSlot = useMemo(() => Math.max(12, ...(drafts ?? []).flatMap((d) => d.picks.map((p) => p.slot))), [drafts])
  const { allSlots, selected: selectedSlots, toggleSlot, slotFilter } = useSelectedSlots(slotsParam, setSlots, maxSlot)

  // League scopes BOTH inputs (drafts for builds, seasons for finish outcomes) to that tier only;
  // Team narrows the whole sample to one franchise; Draft slot keeps only those draft-order positions.
  const analysis = useMemo(() => {
    if (!drafts || !seasons) return undefined
    const d = league === 'ALL' ? drafts : drafts.filter((x) => x.tier === league)
    const s = league === 'ALL' ? seasons : seasons.filter((x) => x.tier === league)
    return analyzeBuilds(d, s, threshold, selected, team ? [team] : undefined, slotFilter)
  }, [drafts, seasons, league, threshold, selected, team, slotFilter])

  const rows = useMemo(() => {
    if (!analysis) return []
    // A single-franchise sample is tiny, so the min-teams noise filter (and its control) drops to 1.
    const min = team ? 1 : minTeams
    return analysis.builds.filter((b) => b.teams >= min)
  }, [analysis, team, minTeams])
  const columns = useMemo(() => buildColumns(analysis?.baselines ?? EMPTY_BASELINES, openKey), [analysis?.baselines, openKey])
  const toggleOpen = (b: BuildStat) => setOpenKey((k) => (k === b.key ? undefined : b.key))

  const loadError = draftsError ?? seasonsError
  if (draftsLoading || seasonsLoading) return <LoadingSpinner />
  if (loadError || !analysis) return <ErrorMessage error={loadError ?? 'No data'} />

  const openBuild = analysis.builds.find((b) => b.key === openKey)

  return (
    <div className="space-y-6">
      <Intro threshold={threshold} totalTeams={analysis.totalTeams} />
      <Controls league={league} onLeague={setLeague} team={team} onTeam={setTeam} teamOptions={teamOptions} threshold={threshold} onThreshold={setRounds} minParam={minParam} onMin={setMin} showMin={!team} selected={selected} onTogglePos={togglePos} allSlots={allSlots} selectedSlots={selectedSlots} onToggleSlot={toggleSlot} />

      {rows.length === 0 ? (
        <p className="text-muted">{emptyMessage(team)}</p>
      ) : (
        <DataTable
          key={`${league}-${team}-${threshold}-${minTeams}-${posParam}-${slotsParam}`}
          columns={columns}
          rows={rows}
          getRowKey={(b) => b.key}
          initialSort={{ key: 'teams', dir: 'desc' }}
          stickyFirstColumn
          onRowClick={toggleOpen}
          selectedRowKey={openKey}
        />
      )}

      {openBuild && <DraftBuildDetail build={openBuild} threshold={threshold} onClose={() => setOpenKey(undefined)} />}

      <p className="text-sm text-muted">
        Each bracket shows the share of that build's team-seasons landing in it (raw count beside it). The{' '}
        <strong className="text-text">baseline</strong> in each header is the rate you'd expect by chance —{' '}
        <span className="text-positive">green</span> beats it, <span className="text-negative">red</span> trails it. A build
        can appear in several brackets (top 3 ⊂ top 6 ⊂ top 9). Unfinished seasons are excluded.
      </p>
    </div>
  )
}
