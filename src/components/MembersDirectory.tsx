import { useMemo } from 'react'
import { getMember, ownerNames } from '@/config'
import type { CareerStats } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { TeamLogo } from './TeamLogo'

export function MembersDirectory({ careers, onSelect }: { careers: CareerStats[]; onSelect: (ffuId: string) => void }) {
  const columns = useMemo<Column<CareerStats>[]>(
    () => [
      {
        key: 'team',
        header: 'Team',
        sortValue: (c) => getMember(c.memberId)?.name ?? c.memberId,
        render: (c) => (
          <button type="button" onClick={() => onSelect(c.memberId)} className="flex items-center gap-2 hover:underline">
            <TeamLogo ffuId={c.memberId} size={22} />
            <span className="font-medium">{getMember(c.memberId)?.name ?? c.memberId}</span>
            {c.isActive && <span className="size-1.5 rounded-full bg-emerald-500" title="Active" aria-label="Active" />}
          </button>
        ),
      },
      { key: 'owner', header: 'Owner', render: (c) => ownerNames(c.memberId).join(' / ') || '—' },
      { key: 'seasons', header: 'Seasons', align: 'right', sortValue: (c) => c.seasons, render: (c) => c.seasons },
      {
        key: 'record',
        header: 'Record',
        align: 'right',
        render: (c) => `${c.wins}-${c.losses}${c.ties > 0 ? `-${c.ties}` : ''}`,
      },
      { key: 'winpct', header: 'Win%', align: 'right', sortValue: (c) => c.winPct, render: (c) => `${(c.winPct * 100).toFixed(1)}%` },
      { key: 'titles', header: 'Titles', align: 'right', sortValue: (c) => c.championships, render: (c) => c.championships || '—' },
      { key: 'best', header: 'Best', align: 'right', sortValue: (c) => c.bestFinish ?? 999, render: (c) => c.bestFinish ?? '—' },
    ],
    [onSelect],
  )

  return (
    <DataTable columns={columns} rows={careers} getRowKey={(c) => c.memberId} initialSort={{ key: 'seasons', dir: 'desc' }} />
  )
}
