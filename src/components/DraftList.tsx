import { useMemo } from 'react'
import type { DraftData, DraftPick } from '@/data'
import { getMember, nameForYear } from '@/config'
import { isTraded, pickLabel, teamsBySlot } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { TeamLogo } from './TeamLogo'

export function DraftList({ draft, year }: { draft: DraftData; year: string }) {
  const bySlot = useMemo(() => teamsBySlot(draft), [draft])
  const numTeams = bySlot.size

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
      { key: 'pos', header: 'Pos', sortValue: (p) => p.player.position, render: (p) => p.player.position },
      { key: 'nfl', header: 'NFL', render: (p) => p.player.nflTeam ?? '—' },
    ],
    [year, bySlot, numTeams],
  )

  return (
    <DataTable columns={columns} rows={draft.picks} getRowKey={(p) => String(p.overall)} initialSort={{ key: 'overall', dir: 'asc' }} pageSize={32} />
  )
}
