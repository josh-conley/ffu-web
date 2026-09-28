import { useMemo } from 'react'
import type { Tier } from '@/config'
import { nameForYear } from '@/config'
import type { LiveSeasonData } from '@/data'
import { useLiveStandingsLines, type StandingsLines } from '@/hooks/useStandingsLines'
import { baseRateFor, firstOutside, inPictureOrder, recordKey, standingsThroughPreviousWeek, type LiveStandingRow, type PlayoffBerth } from '@/selectors'
import { DataTable, type Column } from './DataTable'
import { recordLabel } from './format'
import { LEAGUE_STYLES } from './leagues'
import { BerthTag, CutLabel } from './standingsMarks'
import { baseRateSentence, PICTURE_CAPTION } from './standingsText'
import { TeamLogo } from './TeamLogo'

// Three of these sit side by side on the home page, inside a container that is barely 320px per
// column on a laptop and narrower still on a phone — so this table is built to FIT (see DataTable's
// `fit`) rather than to scroll. Nothing here is ever reached by scrolling sideways.
//
// That width is why the record and the two points totals sit UNDER the team name in muted type
// rather than in columns of their own: two columns leave the name most of the table, so it reads on
// one line, and the numbers stay attached to the team they belong to. It is a standings SUMMARY —
// the Standings page is where the rest of the columns (Win%, UPR) and sorting live, so nothing here
// sorts.
//
// The coloured band across the top names the LEAGUE instead of the columns, and replaces them:
// three of these sit in a row with only the tier colour saying which was which, while "# / Team"
// told a reader nothing the rows didn't. It spans both columns as a `colgroup` header, so a screen
// reader announces the league for every cell under it. The columns keep their `header` strings —
// they are what comes back if the band is ever dropped.

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

/** The record's history as a tooltip (from week 3), under the same wording the Standings page uses. */
function baseRateTitle(row: LiveStandingRow, lines: StandingsLines | undefined): string | undefined {
  const rate = baseRateFor(lines?.rates, row.totals)
  return lines?.rates && rate ? baseRateSentence(lines.rates, recordKey(row.totals), rate) : undefined
}

function buildColumns(year: string, lines: StandingsLines | undefined): Column<LiveStandingRow>[] {
  return [
    {
      key: 'rank',
      header: 'Position',
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
            <span className="flex items-center gap-1 text-sm font-semibold leading-tight">
              <span className="min-w-0">{nameForYear(r.totals.memberId, year) ?? r.totals.memberId}</span>
              <Berth berth={lines?.picture.berths.get(r.totals.memberId)} />
            </span>
            {/* Record, then both points columns — labelled, since the sub-line has no header to
                explain which number is which. */}
            <span className="block leading-tight text-muted tabular-nums" title={baseRateTitle(r, lines)}>
              {recordLabel(r.totals)} · {r.totals.pointsFor.toFixed(2)} PF · {r.totals.pointsAgainst.toFixed(2)} PA
            </span>
          </span>
          <StreakTag streak={r.streak} />
        </span>
      ),
    },
  ]
}

function Berth({ berth }: { berth: PlayoffBerth | undefined }) {
  return berth ? <BerthTag berth={berth} /> : null
}

/** One tier's standings-through-last-completed-week — the table's own header row is tier-colored,
 *  so no separate label bar is needed above it. */
export function CurrentWeekStandings({ tier, data }: { tier: Tier; data: LiveSeasonData }) {
  const standings = useMemo(() => standingsThroughPreviousWeek(data), [data])
  // Mid-season the rows follow the playoff picture ("if the season ended today"), with the line
  // drawn under the last team in. Until the archive loads (divisions come from it) it's plain order.
  const lines = useLiveStandingsLines(data, standings)
  const rows = useMemo(() => (lines ? inPictureOrder(standings, lines.picture, (r) => r.totals.memberId) : standings), [standings, lines])
  const columns = useMemo(() => buildColumns(data.year, lines), [data.year, lines])
  const dividers = useMemo(() => {
    const first = lines ? firstOutside(lines.picture) : undefined
    return lines && first !== undefined ? new Map([[first, <CutLabel relegation={lines.relegation} />]]) : undefined
  }, [lines])

  // Nothing to say before a week has finished. The caller decides whether the section appears at
  // all (see Overview), so an explanatory placeholder here would only be noise — and would print
  // once per tier.
  if (data.currentWeek <= 1) return null

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.totals.memberId}
      headerClassName={LEAGUE_STYLES[tier].solidHeader}
      heading={LEAGUE_STYLES[tier].label}
      dividers={dividers}
      caption={lines ? PICTURE_CAPTION : undefined}
      fit
    />
  )
}
