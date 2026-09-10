import { useMemo } from 'react'
import { nameForYear } from '@/config'
import type { Tier } from '@/config'
import type { Baseline, PickComparison, PlayerMarket } from '@/selectors'
import { deltaFor, pickIn } from '@/selectors'
import { DataTable, type Column } from '../DataTable'
import { LEAGUE_STYLES, TIER_PRESTIGE } from '../leagues'

const one = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** A reach is positive and a value negative; both are shown as a signed slot count. */
function Delta({ value }: { value: number }) {
  const reach = value > 0
  return (
    <span className={`font-mono font-semibold tabular-nums ${reach ? 'text-national' : 'text-premier'}`}>
      {reach ? '+' : ''}
      {one(value)}
    </span>
  )
}

function TierTag({ tier }: { tier: Tier }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-semibold ${LEAGUE_STYLES[tier].text}`}>
      <span aria-hidden className={`size-2 shrink-0 ${LEAGUE_STYLES[tier].dot}`} />
      {LEAGUE_STYLES[tier].label}
    </span>
  )
}

const PlayerCell = ({ c }: { c: PickComparison }) => (
  <span className="whitespace-nowrap">
    <span className="font-semibold">{c.player.name}</span>
    <span className="ml-1.5 font-mono text-[11px] text-muted">{c.player.position}</span>
  </span>
)

/** Reaches or values, against whichever baseline the page is showing. */
export function ComparisonTable({
  rows,
  baseline,
  year,
}: {
  rows: PickComparison[]
  baseline: Baseline
  year: string
}) {
  const columns = useMemo<Column<PickComparison>[]>(
    () => [
      { key: 'player', header: 'Player', render: (c) => <PlayerCell c={c} /> },
      { key: 'tier', header: 'League', render: (c) => <TierTag tier={c.tier} /> },
      { key: 'pick', header: 'Pick', align: 'right', sortValue: (c) => c.overall, render: (c) => `#${c.overall}` },
      {
        key: 'by',
        header: 'Drafted by',
        render: (c) => <span className="whitespace-nowrap">{nameForYear(c.memberId, year) ?? c.memberId}</span>,
      },
      {
        key: 'baseline',
        header: baseline === 'ffu' ? 'Other leagues' : 'Sleeper ADP',
        align: 'right',
        sortValue: (c) => (baseline === 'ffu' ? c.fieldAdp : (c.adp ?? 0)),
        render: (c) => one(baseline === 'ffu' ? c.fieldAdp : (c.adp ?? 0)),
      },
      {
        key: 'delta',
        header: 'Diff',
        align: 'right',
        sortValue: (c) => deltaFor(c, baseline) ?? 0,
        render: (c) => <Delta value={deltaFor(c, baseline) ?? 0} />,
      },
    ],
    [baseline, year],
  )
  return <DataTable columns={columns} rows={rows} getRowKey={(c) => `${c.tier}-${c.overall}`} />
}

/** Every player, with where each league took them side by side. */
export function BoardTable({ markets, adp }: { markets: PlayerMarket[]; adp: Record<string, number> }) {
  const hasAdp = Object.keys(adp).length > 0
  const columns = useMemo<Column<PlayerMarket>[]>(() => {
    const tierColumns = TIER_PRESTIGE.map((tier) => ({
      key: tier,
      header: LEAGUE_STYLES[tier].label,
      align: 'right' as const,
      sortValue: (m: PlayerMarket) => pickIn(m, tier)?.overall ?? 999,
      render: (m: PlayerMarket) => {
        const pick = pickIn(m, tier)
        return pick ? <span className="font-mono tabular-nums">#{pick.overall}</span> : <span className="text-muted">—</span>
      },
    }))
    return [
      {
        key: 'player',
        header: 'Player',
        sortValue: (m) => m.player.name,
        render: (m) => (
          <span className="whitespace-nowrap">
            <span className="font-semibold">{m.player.name}</span>
            <span className="ml-1.5 font-mono text-[11px] text-muted">{m.player.position}</span>
          </span>
        ),
      },
      ...tierColumns,
      {
        key: 'ffuAdp',
        header: 'FFU ADP',
        align: 'right',
        sortValue: (m) => m.ffuAdp,
        render: (m) => <span className="font-mono font-semibold tabular-nums">{one(m.ffuAdp)}</span>,
      },
      ...(hasAdp
        ? [
            {
              key: 'adp',
              header: 'Sleeper ADP',
              align: 'right' as const,
              sortValue: (m: PlayerMarket) => adp[m.player.id] ?? 999,
              render: (m: PlayerMarket) => {
                const value = adp[m.player.id]
                return value === undefined ? <span className="text-muted">—</span> : <span className="font-mono tabular-nums">{one(value)}</span>
              },
            },
          ]
        : []),
      {
        key: 'spread',
        header: 'Spread',
        align: 'right',
        title: 'Gap between the earliest and latest league to take them',
        sortValue: (m) => m.latest - m.earliest,
        render: (m) => (m.picks.length < 2 ? <span className="text-muted">—</span> : one(m.latest - m.earliest)),
      },
    ]
  }, [adp, hasAdp])

  return (
    <DataTable
      columns={columns}
      rows={markets}
      getRowKey={(m) => m.player.id}
      initialSort={{ key: 'ffuAdp', dir: 'asc' }}
      pageSize={25}
    />
  )
}
