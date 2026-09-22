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
 * `fit`) rather than to scroll. Nothing here is ever reached by scrolling sideways.
 *
 * That width is why the record and the two points totals sit UNDER the team name in muted type
 * rather than in columns of their own: two columns leave the name most of the table, so it reads on
 * one line, and the numbers stay attached to the team they belong to. It is a standings SUMMARY —
 * the Standings page is where the rest of the columns (Win%, UPR) and sorting live, so the headers
 * here are labels rather than buttons.
 */
/** The run a team is on, in the league's own shorthand: 2W, 3L. Absent unless there is one, so a
 *  team that just split its last two says nothing rather than "0". */
function StreakTag({ streak }: { streak: LiveStandingRow['streak'] }) {
  if (streak === undefined) return null
  const won = streak.kind === 'W'
  return (
    <span
      title={`${streak.length} straight ${won ? 'wins' : 'losses'}, since week ${streak.fromWeek}`}
      className={`shrink-0 font-bold tabular-nums ${won ? 'text-positive' : 'text-negative'}`}
    >
      {streak.length}
      {streak.kind}
    </span>
  )
}

function buildColumns(year: string): Column<LiveStandingRow>[] {
  return [
    {
      key: 'rank',
      header: '#',
      title: 'Position',
      width: '2.25rem',
      render: (r) => <span className="font-semibold tabular-nums">{r.rank}</span>,
    },
    {
      key: 'team',
      header: 'Team',
      render: (r) => (
        <span className="flex items-center gap-2">
          <TeamLogo ffuId={r.totals.memberId} size={26} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight">
              {nameForYear(r.totals.memberId, year) ?? r.totals.memberId}
            </span>
            {/* Record, then both points columns — labelled, since the sub-line has no header to
                explain which number is which. */}
            <span className="block leading-tight text-muted tabular-nums">
              {recordLabel(r.totals)} · {r.totals.pointsFor.toFixed(2)} PF · {r.totals.pointsAgainst.toFixed(2)} PA
            </span>
          </span>
          <StreakTag streak={r.streak} />
        </span>
      ),
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
      headerClassName={LEAGUE_STYLES[tier].solidHeader}
      fit
    />
  )
}
