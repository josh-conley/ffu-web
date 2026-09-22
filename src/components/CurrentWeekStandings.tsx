import { useMemo } from 'react'
import type { Tier } from '@/config'
import { nameForYear } from '@/config'
import type { LiveSeasonData } from '@/data'
import { standingsThroughPreviousWeek, type LiveStandingRow } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { recordLabel } from './format'
import { LEAGUE_STYLES } from './leagues'
import { TeamLogo } from './TeamLogo'

/**
 * Three of these sit side by side on the home page, inside a container that is barely 320px per
 * column on a laptop and narrower still on a phone — so this table is built to FIT (see DataTable's
 * `fit`) rather than to scroll. Every column is on screen at every width; the only thing that gives
 * is the team name, which wraps to a second line instead of being cut off or pushing the table wide.
 *
 * Hence the abbreviated headers and the fixed widths below: each number column is given exactly what
 * its widest value needs ("12", "10-2-1", "1600.25") at `fit`'s type size, and the name column keeps
 * everything left over — which at the tightest width (three across on a laptop, ~320px each) is
 * enough for all but the longest few names in the league.
 */
function buildColumns(year: string): Column<LiveStandingRow>[] {
  return [
    {
      key: 'rank',
      header: '#',
      title: 'Position',
      width: '2.25rem',
      sortValue: (r) => r.rank,
      render: (r) => <span className="font-semibold tabular-nums">{r.rank}</span>,
    },
    {
      key: 'team',
      header: 'Team',
      sortValue: (r) => nameForYear(r.totals.memberId, year) ?? r.totals.memberId,
      render: (r) => (
        <span className="flex items-center gap-1.5">
          <TeamLogo ffuId={r.totals.memberId} size={20} />
          <span className="min-w-0 font-semibold leading-tight">{nameForYear(r.totals.memberId, year) ?? r.totals.memberId}</span>
        </span>
      ),
    },
    {
      key: 'record',
      header: 'W-L',
      title: 'Record',
      align: 'right',
      width: '3.25rem',
      sortValue: (r) => r.totals.winPct,
      render: (r) => <span className="tabular-nums">{recordLabel(r.totals)}</span>,
    },
    {
      key: 'pf',
      header: 'PF',
      align: 'right',
      title: 'Points For',
      width: '4rem',
      sortValue: (r) => r.totals.pointsFor,
      render: (r) => <span className="tabular-nums">{r.totals.pointsFor.toFixed(2)}</span>,
    },
  ]
}

/** One tier's standings-through-last-completed-week — the table's own header row is tier-colored,
 *  so no separate label bar is needed above it. */
export function CurrentWeekStandings({ tier, data }: { tier: Tier; data: LiveSeasonData }) {
  const columns = useMemo(() => buildColumns(data.year), [data.year])

  // Nothing to say before a week has finished. The caller decides whether the section appears at
  // all (see Overview), so an explanatory placeholder here would only be noise — and would print
  // once per tier.
  if (data.currentWeek <= 1) return null

  return (
    <DataTable
      columns={columns}
      rows={standingsThroughPreviousWeek(data)}
      getRowKey={(r) => r.totals.memberId}
      initialSort={{ key: 'rank', dir: 'asc' }}
      headerClassName={LEAGUE_STYLES[tier].solidHeader}
      fit
    />
  )
}
