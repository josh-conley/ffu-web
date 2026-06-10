import { useMemo } from 'react'
import type { DraftData, DraftPick } from '@/data'
import { getMember, nameForYear } from '@/config'
import { isTraded, pickLabel, teamsBySlot } from '@/selectors'
import { useFilters, type FilterDef, type FilterOption } from '@/hooks/useFilters'
import { DataTable, type Column } from './DataTable'
import { FilterBar } from './FilterBar'
import { posClass } from './positions'
import { TeamLogo } from './TeamLogo'

const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

/** Positions actually present in this draft, in canonical order (then any extras alphabetically). */
function positionOptions(draft: DraftData): FilterOption[] {
  const present = new Set(draft.picks.map((p) => p.player.position))
  const ranked = [...present].sort((a, b) => {
    const ia = POS_ORDER.indexOf(a)
    const ib = POS_ORDER.indexOf(b)
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib) || a.localeCompare(b)
  })
  return ranked.map((p) => ({ value: p, label: p }))
}

/** Teams in the draft, in draft-order (by slot), labeled with their name that year. */
function teamOptions(bySlot: Map<number, string>, year: string): FilterOption[] {
  return [...bySlot.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, memberId]) => ({ value: memberId, label: nameForYear(memberId, year) ?? memberId }))
}

export function DraftList({ draft, year }: { draft: DraftData; year: string }) {
  const bySlot = useMemo(() => teamsBySlot(draft), [draft])
  const numTeams = bySlot.size

  const filterDefs = useMemo<FilterDef<DraftPick>[]>(
    () => [
      { key: 'pos', label: 'Position', options: positionOptions(draft), predicate: (p, v) => p.player.position === v },
      { key: 'team', label: 'Team', options: teamOptions(bySlot, year), predicate: (p, v) => p.memberId === v },
    ],
    [draft, bySlot, year],
  )
  const { rows: filtered, values, setValue, clear, activeCount } = useFilters(filterDefs, draft.picks)

  const columns = useMemo<Column<DraftPick>[]>(
    () => [
      { key: 'overall', header: 'Pick', align: 'right', sortValue: (p) => p.overall, render: (p) => p.overall },
      // True snake notation (e.g. 6.09), matching the board — not round.slot, which is wrong in even rounds.
      { key: 'rs', header: 'Rnd', sortValue: (p) => p.overall, render: (p) => pickLabel(p, numTeams) },
      {
        key: 'team',
        header: 'Team',
        render: (p) => {
          const ownerId = bySlot.get(p.slot)
          return (
            <span className="flex items-center gap-2 whitespace-nowrap">
              <TeamLogo ffuId={p.memberId} size={20} />
              <span>{nameForYear(p.memberId, year) ?? p.memberId}</span>
              {isTraded(p, bySlot) && ownerId && (
                <span className="text-[11px] text-accent" title={`Acquired from ${nameForYear(ownerId, year) ?? ownerId}`}>
                  from {getMember(ownerId)?.abbreviation ?? '?'}
                </span>
              )}
            </span>
          )
        },
      },
      { key: 'player', header: 'Player', sortValue: (p) => p.player.name, render: (p) => p.player.name },
      {
        key: 'pos',
        header: 'Pos',
        sortValue: (p) => p.player.position,
        render: (p) => (
          <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${posClass(p.player.position)}`}>
            {p.player.position}
          </span>
        ),
      },
      { key: 'nfl', header: 'NFL', render: (p) => p.player.nflTeam ?? '—' },
    ],
    [year, bySlot, numTeams],
  )

  return (
    <div className="space-y-4">
      <FilterBar defs={filterDefs} values={values} onChange={setValue} onClear={clear} activeCount={activeCount} />
      {filtered.length === 0 ? (
        <p className="text-muted">No picks match these filters.</p>
      ) : (
        // key on the active values resets sort/page when the filtered set changes (DataTable pattern).
        <DataTable
          key={JSON.stringify(values)}
          columns={columns}
          rows={filtered}
          getRowKey={(p) => String(p.overall)}
          initialSort={{ key: 'overall', dir: 'asc' }}
          pageSize={32}
        />
      )}
    </div>
  )
}
