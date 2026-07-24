import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAllDrafts, useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { getMember } from '@/config'
import { analyzeBuilds, FILTER_POSITIONS, type BuildStat } from '@/selectors'
import { DataTable } from '@/components/DataTable'
import { DraftBuildDetail } from '@/components/DraftBuildDetail'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Controls } from './DraftAnalysisControls'
import { useSelectedPositions, useSelectedSlots } from './draftAnalysisFilters'
import { buildColumns } from './draftBuildColumns'

const EMPTY_BASELINES = { first: 0, top3: 0, top6: 0, top9: 0, finish: 0, upr: 0 }

/** Year bounds from the from/to params, defaulting to the full span (kept out of the component body). */
function yearBounds(fromParam: string, toParam: string, years: string[]): [string, string] {
  return [fromParam || years[0] || '', toParam || years.at(-1) || '']
}

const emptyMessage = (team: string) =>
  team
    ? 'No completed drafts for this team in the current scope.'
    : 'No builds meet the minimum team-season count. Lower “Min teams”.'

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

export function DraftAnalysis() {
  const { data: drafts, loading: draftsLoading, error: draftsError } = useAllDrafts()
  const { data: seasons, loading: seasonsLoading, error: seasonsError } = useAllSeasons()

  const [league, setLeague] = useUrlState('league', 'ALL')
  const [team, setTeam] = useUrlState('team', '')
  const [roundsParam, setRounds] = useUrlState('rounds', '3')
  const [minParam, setMin] = useUrlState('min', '10')
  const [posParam, setPos] = useUrlState('pos', FILTER_POSITIONS.join(','))
  const [slotsParam, setSlots] = useUrlState('slots', '')
  const [fromParam, setFrom] = useUrlState('from', '')
  const [toParam, setTo] = useUrlState('to', '')
  const threshold = Number(roundsParam)
  const minTeams = Number(minParam)
  const { selected, togglePos, selectAll: selectAllPos } = useSelectedPositions(posParam, setPos)
  const [, setSearchParams] = useSearchParams()
  const [openKey, setOpenKey] = useState<string | undefined>(undefined)

  // Every franchise that has ever drafted, by name — the Team dropdown's options.
  const teamOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const d of drafts ?? []) for (const p of d.picks) ids.add(p.memberId)
    return [...ids]
      .map((id) => ({ value: id, label: getMember(id)?.name ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [drafts])

  const years = useMemo(() => [...new Set((seasons ?? []).map((s) => s.year))].sort(), [seasons])
  const [fromYear, toYear] = yearBounds(fromParam, toParam, years)

  const maxSlot = useMemo(() => Math.max(12, ...(drafts ?? []).flatMap((d) => d.picks.map((p) => p.slot))), [drafts])
  const { allSlots, selected: selectedSlots, toggleSlot, slotFilter, selectAll: selectAllSlots } = useSelectedSlots(slotsParam, setSlots, maxSlot)

  // League + year range + team + draft slot all scope the sample; see the controls for each.
  const analysis = useMemo(() => {
    if (!drafts || !seasons) return undefined
    const inScope = (x: { tier: string; year: string }) =>
      (league === 'ALL' || x.tier === league) && (!fromYear || x.year >= fromYear) && (!toYear || x.year <= toYear)
    return analyzeBuilds(drafts.filter(inScope), seasons.filter(inScope), threshold, selected, team ? [team] : undefined, slotFilter)
  }, [drafts, seasons, league, fromYear, toYear, threshold, selected, team, slotFilter])

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
      <Controls
        league={league} onLeague={setLeague} team={team} onTeam={setTeam} teamOptions={teamOptions}
        years={years} fromYear={fromYear} toYear={toYear} onFrom={setFrom} onTo={setTo}
        threshold={threshold} onThreshold={setRounds} minParam={minParam} onMin={setMin} showMin={!team}
        selected={selected} onTogglePos={togglePos} onAllPos={selectAllPos} allSlots={allSlots} selectedSlots={selectedSlots} onToggleSlot={toggleSlot} onAllSlots={selectAllSlots}
        onReset={() => setSearchParams(new URLSearchParams(), { replace: true })}
      />

      {rows.length === 0 ? (
        <p className="text-muted">{emptyMessage(team)}</p>
      ) : (
        <DataTable
          key={`${league}-${team}-${fromYear}-${toYear}-${threshold}-${minTeams}-${posParam}-${slotsParam}`}
          columns={columns}
          rows={rows}
          getRowKey={(b) => b.key}
          initialSort={{ key: 'teams', dir: 'desc' }}
          fullBleed
          stickyFirstColumn
          onRowClick={toggleOpen}
          selectedRowKey={openKey}
        />
      )}

      {openBuild && <DraftBuildDetail build={openBuild} threshold={threshold} onClose={() => setOpenKey(undefined)} />}

      <p className="text-sm text-muted">
        <strong className="text-text">Avg</strong>/<strong className="text-text">Med</strong> are the mean/median finish (lower
        is better); <strong className="text-text">UPR</strong> is average power rating (higher is better); each bracket is the
        share (and count) landing in it. Every cell is tinted vs the sample baseline —{' '}
        <span className="text-positive">green</span> beats it, <span className="text-negative">red</span> trails it. Brackets
        nest (top 3 ⊂ top 6 ⊂ top 9). Unfinished seasons are excluded.
      </p>
    </div>
  )
}
