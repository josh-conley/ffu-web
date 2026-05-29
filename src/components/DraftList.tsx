import { useMemo } from 'react'
import type { DraftData, DraftPick } from '@/data'
import { nameForYear } from '@/config'
import { DataTable, type Column } from './DataTable'
import { TeamLogo } from './TeamLogo'

export function DraftList({ draft, year }: { draft: DraftData; year: string }) {
  const columns = useMemo<Column<DraftPick>[]>(
    () => [
      { key: 'overall', header: 'Pick', align: 'right', sortValue: (p) => p.overall, render: (p) => p.overall },
      { key: 'rs', header: 'Rnd', render: (p) => `${p.round}.${String(p.slot).padStart(2, '0')}` },
      {
        key: 'team',
        header: 'Team',
        render: (p) => (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <TeamLogo ffuId={p.memberId} size={20} />
            {nameForYear(p.memberId, year) ?? p.memberId}
          </span>
        ),
      },
      { key: 'player', header: 'Player', sortValue: (p) => p.player.name, render: (p) => p.player.name },
      { key: 'pos', header: 'Pos', sortValue: (p) => p.player.position, render: (p) => p.player.position },
      { key: 'nfl', header: 'NFL', render: (p) => p.player.nflTeam ?? '—' },
      { key: 'college', header: 'College', render: (p) => p.player.college ?? '—' },
      { key: 'age', header: 'Age', align: 'right', sortValue: (p) => p.player.age ?? 0, render: (p) => p.player.age ?? '—' },
    ],
    [year],
  )

  return (
    <DataTable columns={columns} rows={draft.picks} getRowKey={(p) => String(p.overall)} initialSort={{ key: 'overall', dir: 'asc' }} pageSize={32} />
  )
}
