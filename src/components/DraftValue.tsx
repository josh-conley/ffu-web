import { useMemo, type ReactNode } from 'react'
import type { DraftData, SeasonLineups } from '@/data'
import { nameForYear } from '@/config'
import { draftValues, memberDraftValues, type MemberDraftValue, type PickValue } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { posClass } from './positions'
import { TeamLogo } from './TeamLogo'

// Draft ROI view: every pick's position-relative return + a per-member report card.

const f2 = (n: number) => n.toFixed(2)

/** Signed, tone-colored value (green = beat the slot, red = bust territory). */
function signed(v: number, decimals = 0): ReactNode {
  const tone = v > 0 ? 'text-positive' : v < 0 ? 'text-negative' : 'text-muted'
  return (
    <span className={`font-semibold ${tone}`}>
      {v > 0 ? '+' : ''}
      {v.toFixed(decimals)}
    </span>
  )
}

const posLabel = (v: PickValue, n: number) => `${v.pick.player.position}${n}`

function teamCell(memberId: string, year: string): ReactNode {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <TeamLogo ffuId={memberId} size={20} />
      <span>{nameForYear(memberId, year) ?? memberId}</span>
    </span>
  )
}

/** "Player (+9)" capsule for a member's best/worst pick. */
const pickCapsule = (v: PickValue) => (
  <span className="whitespace-nowrap">
    {v.pick.player.name} {signed(v.value)}
  </span>
)

function pickColumns(year: string): Column<PickValue>[] {
  return [
    { key: 'overall', header: 'Pick', align: 'right', sortValue: (v) => v.pick.overall, render: (v) => v.pick.overall },
    { key: 'player', header: 'Player', sortValue: (v) => v.pick.player.name, render: (v) => v.pick.player.name },
    {
      key: 'pos',
      header: 'Pos',
      sortValue: (v) => v.pick.player.position,
      render: (v) => (
        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${posClass(v.pick.player.position)}`}>
          {v.pick.player.position}
        </span>
      ),
    },
    { key: 'team', header: 'Drafted By', render: (v) => teamCell(v.pick.memberId, year) },
    { key: 'pts', header: 'Season Pts', align: 'right', sortValue: (v) => v.seasonPoints, render: (v) => f2(v.seasonPoints) },
    { key: 'starts', header: 'Starts', align: 'right', sortValue: (v) => v.starts, render: (v) => v.starts },
    { key: 'picked', header: 'Drafted As', align: 'right', sortValue: (v) => v.posPicked, render: (v) => posLabel(v, v.posPicked) },
    { key: 'finish', header: 'Finished As', align: 'right', sortValue: (v) => v.posFinish, render: (v) => posLabel(v, v.posFinish) },
    { key: 'value', header: 'Value', align: 'right', sortValue: (v) => v.value, render: (v) => signed(v.value) },
  ]
}

function memberColumns(year: string): Column<MemberDraftValue>[] {
  return [
    { key: 'team', header: 'Team', sortValue: (m) => nameForYear(m.memberId, year) ?? m.memberId, render: (m) => teamCell(m.memberId, year) },
    { key: 'avg', header: 'Avg Value', align: 'right', sortValue: (m) => m.avgValue, render: (m) => signed(m.avgValue, 1) },
    { key: 'pts', header: 'Drafted Pts', align: 'right', sortValue: (m) => m.points, render: (m) => f2(m.points) },
    { key: 'best', header: 'Best Pick', align: 'right', sortValue: (m) => m.best.value, render: (m) => pickCapsule(m.best) },
    { key: 'worst', header: 'Worst Pick', align: 'right', sortValue: (m) => m.worst.value, render: (m) => pickCapsule(m.worst) },
  ]
}

export function DraftValue({ draft, lineups, year }: { draft: DraftData; lineups: SeasonLineups | null; year: string }) {
  const values = useMemo(() => (lineups ? draftValues(draft, lineups) : []), [draft, lineups])
  const members = useMemo(() => memberDraftValues(values), [values])

  if (!lineups) {
    return <p className="text-muted">Draft value needs per-week lineup data, which exists only for Sleeper-era seasons (2021 on).</p>
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Report Card</h2>
        <DataTable columns={memberColumns(year)} rows={members} getRowKey={(m) => m.memberId} initialSort={{ key: 'avg', dir: 'desc' }} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Every Pick</h2>
        <DataTable columns={pickColumns(year)} rows={values} getRowKey={(v) => String(v.pick.overall)} initialSort={{ key: 'value', dir: 'desc' }} pageSize={32} />
      </section>
      <p className="text-sm text-muted">
        Value compares where a player was drafted at his position to where he finished by points scored
        while on an FFU roster that season (started or benched). Drafted as RB12, finished as RB3 → +9.
        Weeks spent unrostered don&apos;t count, so a dropped pick&apos;s later production only shows up if
        someone picked him back up.
      </p>
    </div>
  )
}
