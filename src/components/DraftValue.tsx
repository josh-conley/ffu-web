import { useMemo, type ReactNode } from 'react'
import type { DraftData, SeasonLineups } from '@/data'
import { getSeasonMeta, nameForYear } from '@/config'
import { draftValues, memberDraftValues, teamsBySlot, type MemberDraftValue, type PickValue } from '@/selectors'
import { useFilters, type FilterDef } from '@/hooks/useFilters'
import { DataTable, type Column } from './DataTable'
import { FilterBar } from './FilterBar'
import { StatDefs } from './StatDefs'
import { positionOptions, teamOptions } from './draftFilters'
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
    { key: 'pts', header: 'Rostered Pts', title: 'Regular-season points scored while on any FFU roster (started or benched; playoff weeks excluded)', align: 'right', sortValue: (v) => v.rosteredPoints, render: (v) => f2(v.rosteredPoints) },
    { key: 'starts', header: 'Starts', title: 'Regular-season weeks in a starting lineup (any team)', align: 'right', sortValue: (v) => v.starts, render: (v) => v.starts },
    { key: 'picked', header: 'Drafted As', title: 'Nth player at his position taken in this draft', align: 'right', sortValue: (v) => v.posPicked, render: (v) => posLabel(v, v.posPicked) },
    { key: 'finish', header: 'Finished As', title: 'Rank at his position by rostered points, among drafted players', align: 'right', sortValue: (v) => v.posFinish, render: (v) => posLabel(v, v.posFinish) },
    { key: 'value', header: 'Value', title: 'Drafted As minus Finished As — positive beat the draft slot', align: 'right', sortValue: (v) => v.value, render: (v) => signed(v.value) },
  ]
}

function memberColumns(year: string): Column<MemberDraftValue>[] {
  return [
    { key: 'team', header: 'Team', sortValue: (m) => nameForYear(m.memberId, year) ?? m.memberId, render: (m) => teamCell(m.memberId, year) },
    { key: 'avg', header: 'Avg Value', title: 'Mean Value across this member’s picks — the draft grade', align: 'right', sortValue: (m) => m.avgValue, render: (m) => signed(m.avgValue, 1) },
    { key: 'pts', header: 'Drafted Pts', title: 'Combined rostered points of everyone this member drafted', align: 'right', sortValue: (m) => m.points, render: (m) => f2(m.points) },
    { key: 'best', header: 'Best Pick', align: 'right', sortValue: (m) => m.best.value, render: (m) => pickCapsule(m.best) },
    { key: 'worst', header: 'Worst Pick', align: 'right', sortValue: (m) => m.worst.value, render: (m) => pickCapsule(m.worst) },
  ]
}

const VALUE_DEFS = (
  <StatDefs
    items={[
      { term: 'Rostered Pts', def: 'Regular-season points (weeks 1–14) the player scored while on an FFU roster, from the weekly Sleeper lineups — started and benched weeks both count. Deliberately NOT his full NFL season: weeks spent on waivers don’t count, because nobody in the league got those points.' },
      { term: 'Drafted As / Finished As', def: 'Where he went in this draft at his position vs. where he finished at his position by rostered points (among drafted players). RB12 = the 12th running back.' },
      { term: 'Value', def: 'Drafted As minus Finished As. Drafted RB12 but finished RB3 → +9, a steal; big negatives are the busts. Position-relative, so QBs aren’t automatically on top.' },
      { term: 'Avg Value', def: 'The report-card grade: mean Value across all of a member’s picks.' },
      { term: 'Drafted Pts', def: 'Combined rostered points of everyone the member drafted.' },
    ]}
  />
)

export function DraftValue({ draft, lineups, year }: { draft: DraftData; lineups: SeasonLineups | null; year: string }) {
  const era = getSeasonMeta(draft.tier, draft.year)?.era ?? 'sleeper'
  const pickValues = useMemo(() => (lineups ? draftValues(draft, lineups, era) : []), [draft, lineups, era])
  const members = useMemo(() => memberDraftValues(pickValues), [pickValues])
  const bySlot = useMemo(() => teamsBySlot(draft), [draft])
  const filterDefs = useMemo<FilterDef<PickValue>[]>(
    () => [
      { key: 'pos', label: 'Position', options: positionOptions(draft), predicate: (v, val) => v.pick.player.position === val },
      { key: 'team', label: 'Team', options: teamOptions(bySlot, year), predicate: (v, val) => v.pick.memberId === val },
    ],
    [draft, bySlot, year],
  )
  const { rows: filtered, values: filterValues, setValue, clear, activeCount } = useFilters(filterDefs, pickValues)

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
        <FilterBar defs={filterDefs} values={filterValues} onChange={setValue} onClear={clear} activeCount={activeCount} />
        {filtered.length === 0 ? (
          <p className="text-muted">No picks match these filters.</p>
        ) : (
          <DataTable
            key={JSON.stringify(filterValues)}
            columns={pickColumns(year)}
            rows={filtered}
            getRowKey={(v) => String(v.pick.overall)}
            initialSort={{ key: 'value', dir: 'desc' }}
            pageSize={32}
            fullBleed
          />
        )}
      </section>
      {VALUE_DEFS}
    </div>
  )
}
