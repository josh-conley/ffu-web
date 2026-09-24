import { useMemo, useState } from 'react'
import { usePlayerData } from '@/hooks/usePlayerData'
import { useUrlState } from '@/hooks/useUrlState'
import { useFilters, type FilterDef } from '@/hooks/useFilters'
import { playerAppearances, playerHistory, playerSummaries, type PlayerSummary } from '@/selectors'
import { PlayerIndexTable } from '@/components/players/PlayerIndexTable'
import { PlayerDetailPanel } from '@/components/players/PlayerDetailPanel'
import { FilterBar } from '@/components/FilterBar'
import { SELECT } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'DEF']

const FILTERS: FilterDef<PlayerSummary>[] = [
  { key: 'pos', label: 'Position', options: POSITIONS.map((p) => ({ value: p, label: p })), predicate: (r, v) => r.position === v },
]

/** Case- and accent-insensitive name match, so "st brown" finds "Amon-Ra St. Brown". */
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()

/**
 * Players — every NFL player an FFU team has started, ranked by the points he scored in FFU
 * starting lineups. A row opens in place to show his FFU history. Lineups exist from 2021, so this
 * is the Sleeper era.
 */
export function Players() {
  const { lineups, players, seasons, drafts, loading, error } = usePlayerData()
  const appearances = useMemo(() => (lineups && seasons ? playerAppearances(lineups, seasons) : []), [lineups, seasons])
  const summaries = useMemo(() => (players ? playerSummaries(appearances, players) : []), [appearances, players])
  const [openKey, setOpenKey] = useState<string>()
  const toggle = (r: PlayerSummary) => setOpenKey((k) => (k === r.playerId ? undefined : r.playerId))
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
          Every NFL player an FFU team has started since 2021, ranked by the points he scored in FFU starting
          lineups. Playoffs counts the playoff runs he started in, Title Gms the championship finals, and Titles the
          finals his team won. Click a player for his title games, where he was drafted, his best weeks and who
          started him.
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
        <PlayerIndexTable
          rows={shown}
          openKey={openKey}
          onToggle={toggle}
          renderExpanded={(r) => <PlayerDetailPanel history={playerHistory(r.playerId, appearances, drafts)} />}
        />
      ) : (
        <p className="border border-dashed border-border bg-surface/60 p-4 text-sm text-muted">No players match.</p>
      )}
    </div>
  )
}
