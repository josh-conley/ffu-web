import type { RankedUprRow } from '@/selectors'
import type { Column } from '@/components/DataTable'
import { formatPoints, recordLabel } from '@/components/format'
import { LeagueBadge } from '@/components/LeagueBadge'
import { TeamCell } from '@/components/TeamCell'

// Column defs for the UPR Explorer table (kept out of the page for the line caps). After the
// rating come its ingredients — average, high, low, win% — so a row shows why it rates where it
// does. Every number is over the chosen weeks, not the team's whole season.

function numCol(key: string, header: string, get: (r: RankedUprRow) => number, fmt: (n: number) => string, title?: string): Column<RankedUprRow> {
  return { key, header, title, align: 'right', sortValue: get, render: (r) => <span className="tabular-nums">{fmt(get(r))}</span> }
}

/** Rank and team in one pinned column, so a phone scrolling the numbers still sees whose they are. */
const teamColumn: Column<RankedUprRow> = {
  key: 'team',
  header: 'Team',
  title: 'Rank by UPR over the chosen weeks, in the chosen order',
  sortValue: (r) => r.rank,
  render: (r) => (
    <span className="flex items-center gap-2">
      <span className="w-7 shrink-0 text-right text-xs font-bold tabular-nums text-muted">{r.rank}</span>
      <TeamCell ffuId={r.memberId} year={r.year} />
    </span>
  ),
}

/** The year, tagged while that season is still being played. */
const yearColumn: Column<RankedUprRow> = {
  key: 'year',
  header: 'Year',
  sortValue: (r) => r.year,
  render: (r) => (
    <span className="flex items-center gap-1.5 whitespace-nowrap tabular-nums">
      {r.year}
      {r.live && <span className="border border-accent px-1 text-[10px] font-bold uppercase tracking-wide text-accent">Live</span>}
    </span>
  ),
}

export const UPR_EXPLORER_COLUMNS: Column<RankedUprRow>[] = [
  teamColumn,
  yearColumn,
  { key: 'league', header: 'League', sortValue: (r) => r.tier, render: (r) => <LeagueBadge tier={r.tier} /> },
  { ...numCol('upr', 'UPR', (r) => r.upr, (n) => n.toFixed(2)), render: (r) => <span className="font-bold tabular-nums">{r.upr.toFixed(2)}</span> },
  { key: 'record', header: 'Record', align: 'right', sortValue: (r) => r.totals.winPct, render: (r) => <span className="tabular-nums">{recordLabel(r.totals)}</span> },
  numCol('avg', 'Avg', (r) => r.totals.average, formatPoints, 'Average score over the chosen weeks'),
  numCol('high', 'High', (r) => r.totals.high, formatPoints, 'Highest score over the chosen weeks'),
  numCol('low', 'Low', (r) => r.totals.low, formatPoints, 'Lowest score over the chosen weeks'),
  numCol('winpct', 'Win%', (r) => r.totals.winPct, (n) => `${(n * 100).toFixed(1)}%`),
  numCol('games', 'G', (r) => r.totals.scores.length, String, 'Games counted (a 13-week season has one fewer through week 14)'),
]
