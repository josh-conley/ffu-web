import { useMemo } from 'react'
import { usePlayerData } from '@/hooks/usePlayerData'
import { useUrlState } from '@/hooks/useUrlState'
import { useFilters, type FilterDef } from '@/hooks/useFilters'
import { playerAppearances, playerSummaries, type PlayerSummary } from '@/selectors'
import { PlayerIndexTable } from '@/components/players/PlayerIndexTable'
import { FilterBar } from '@/components/FilterBar'
import { SELECT } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'DEF']

const FILTERS: FilterDef<PlayerSummary>[] = [
  { key: 'pos', label: 'Position', options: POSITIONS.map((p) => ({ value: p, label: p })), predicate: (r, v) => r.position === v },
  { key: 'started', label: 'Started only', type: 'toggle', predicate: (r) => r.starts > 0 },
]

/** Case- and accent-insensitive name match, so "st brown" finds "Amon-Ra St. Brown". */
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()

/**
 * Players — every NFL player who has been on an FFU roster, ranked by the points he scored in FFU
 * starting lineups. Each links to his FFU history. Lineups exist from 2021, so this is the Sleeper era.
 */
export function Players() {
  const { lineups, players, seasons, loading, error } = usePlayerData()
  const summaries = useMemo(
    () => (lineups && players && seasons ? playerSummaries(playerAppearances(lineups, seasons), players) : []),
    [lineups, players, seasons],
  )
  const [query, setQuery] = useUrlState('q', '')
  const { rows, values, setValue, clear, activeCount } = useFilters(FILTERS, summaries)
  const needle = normalize(query)
  const shown = useMemo(() => (needle ? rows.filter((r) => normalize(r.name).includes(needle)) : rows), [rows, needle])

  if (loading) return <LoadingSpinner />
  if (error || !lineups || !players || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Players</h1>
        <p className="max-w-2xl text-sm text-muted">
          Every NFL player who has been on an FFU roster since 2021, ranked by the points he scored in FFU starting
          lineups. Pick one to see who started him, where he was drafted and the titles he played in.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Search</span>
          <input
            type="search"
            className={`${SELECT} w-56`}
            placeholder="Player name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <FilterBar defs={FILTERS} values={values} onChange={setValue} onClear={clear} activeCount={activeCount} />
      </div>
      {shown.length > 0 ? (
        <PlayerIndexTable rows={shown} />
      ) : (
        <p className="border border-dashed border-border bg-surface/60 p-4 text-sm text-muted">No players match.</p>
      )}
    </div>
  )
}
