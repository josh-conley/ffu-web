import type { ReactNode } from 'react'
import { winPct as recordWinPct, type SeasonCompare as SeasonData, type SeasonSide, type WinLoss } from '@/selectors'
import { formatPoints, ordinal, recordLabel } from '../format'
import { LeagueBadge } from '../LeagueBadge'
import { teamAbbr } from '../seriesText'
import { CompareTable, StatRow, type Better } from './CompareRows'
import { EVERY_WEEK_TITLE, VsRows } from './VsRows'

// The latest season side by side, above the career comparison: where each team stands now, in the
// league it is playing in. Record and points are Sleeper's stored season figures, as on Standings.

const dash = '—'
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

const games = (s: SeasonSide) => s.team.record.wins + s.team.record.losses + s.team.record.ties
const winPct = (s: SeasonSide) => recordWinPct(s.team.record)
const ppg = (s: SeasonSide) => (games(s) === 0 ? undefined : s.team.points.for / games(s))

/**
 * One season figure for both sides: a dash for a side that didn't play the season, or has no such
 * figure yet; the better one in green only when both sides have one to compare.
 */
function SeasonRow({ label, title, a, b, show, value, better = 'high' }: {
  label: string
  title?: string
  a: SeasonSide | undefined
  b: SeasonSide | undefined
  show: (s: SeasonSide) => ReactNode
  value?: (s: SeasonSide) => number | undefined
  better?: Better
}) {
  const [va, vb] = [a && value?.(a), b && value?.(b)]
  return (
    <StatRow
      label={label}
      title={title}
      a={a ? show(a) ?? dash : dash}
      b={b ? show(b) ?? dash : dash}
      values={va !== undefined && vb !== undefined ? [va, vb] : undefined}
      better={better}
    />
  )
}

export function SeasonCompare({ aId, bId, season, h2h }: { aId: string; bId: string; season: SeasonData; h2h: WinLoss | undefined }) {
  const { a, b, year } = season
  // A standing is only comparable inside one league: 2nd in Premier isn't "behind" 1st in National.
  const sameLeague = a !== undefined && b !== undefined && a.tier === b.tier
  return (
    <CompareTable aLabel={teamAbbr(aId)} bLabel={teamAbbr(bId)} caption={`${year} season comparison`}>
      <SeasonRow label="League" a={a} b={b} show={(s) => <span className="font-sans"><LeagueBadge tier={s.tier} /></span>} />
      <SeasonRow
        label="Standing"
        title="Regular-season place in their own league"
        a={a}
        b={b}
        show={(s) => ordinal(s.rank)}
        value={sameLeague ? (s) => s.rank : undefined}
        better="low"
      />
      <SeasonRow label="Record" a={a} b={b} show={(s) => recordLabel(s.team.record)} value={winPct} />
      <SeasonRow label="Win %" a={a} b={b} show={(s) => pct(winPct(s))} value={winPct} />
      <SeasonRow label="PPG" title="Points per game" a={a} b={b} show={(s) => ppg(s)?.toFixed(2)} value={ppg} />
      <SeasonRow label="Points For" a={a} b={b} show={(s) => formatPoints(s.team.points.for)} value={(s) => s.team.points.for} />
      <SeasonRow label="UPR" title="Union Power Rating this season (rated from week 3)" a={a} b={b} show={(s) => s.upr?.toFixed(2)} value={(s) => s.upr} />
      <VsRows h2h={h2h} common={season.common} weekly={season.weekly} everyWeekTitle={`${EVERY_WEEK_TITLE}, this season`} />
    </CompareTable>
  )
}
