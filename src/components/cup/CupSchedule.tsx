import { useMemo } from 'react'
import { DataTable, type Column } from '../DataTable'
import type { RoundOutline } from '@/selectors'

// The Schedule of Events. Every number here is DERIVED from the season's published rounds by
// `outlineTournament` — the JSON says which weeks the rounds fall on, the selector says how big
// each round is, and this component only formats them.

function scheduleColumns(): Column<RoundOutline>[] {
  return [
    { key: 'label', header: 'Round', render: (r) => <span className="font-semibold whitespace-nowrap">{r.label}</span> },
    { key: 'week', header: 'NFL Week', align: 'right', render: (r) => r.week },
    { key: 'entrants', header: 'Teams', align: 'right', render: (r) => r.entrants },
    { key: 'matchups', header: 'Games', align: 'right', render: (r) => r.matchups },
    {
      key: 'out',
      header: 'Eliminated',
      align: 'right',
      // Losers, plus the lowest-scoring winner in the round that carries the drop.
      render: (r) => r.matchups + r.dropped,
    },
  ]
}

export function CupSchedule({ rounds }: { rounds: RoundOutline[] }) {
  const columns = useMemo(() => scheduleColumns(), [])
  return <DataTable rows={rounds} columns={columns} getRowKey={(r) => r.key} />
}
