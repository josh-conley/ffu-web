import type { LeagueWeekScoring } from '@/selectors'
import { LEAGUE_STYLES } from '../leagues'
import { RecapPanel } from './RecapPanel'

/**
 * League against league for the WEEK — the counterpart to the season-long race the main panel
 * carries, and the line the newsletter uses on whichever tier had a quiet Sunday.
 *
 * Average per team-game sits beside the total: the totals are what the league argues about, but a
 * week where one league is short a game would make the totals lie on their own.
 */

const POINTS = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Row({ row, compact }: { row: LeagueWeekScoring; compact: boolean }) {
  const style = LEAGUE_STYLES[row.tier]
  const won = row.rank === 1
  return (
    <div className="flex min-w-0 items-center gap-3 bg-surface px-3 py-2">
      <span className={`shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${won ? style.solidHeader : style.badge}`}>
        {style.label}
      </span>
      {won && !compact && (
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-muted">Week's best</span>
      )}
      <span className="ml-auto shrink-0 text-right">
        <span className="block font-mono text-base font-bold leading-tight tabular-nums">{POINTS.format(row.total)}</span>
        <span className="block font-mono text-[11px] leading-tight tabular-nums text-muted">
          {row.average.toFixed(2)} avg
        </span>
      </span>
    </div>
  )
}

export function WeekLeagues({
  rows,
  year,
  week,
  compact,
  copyFilename,
}: {
  rows: LeagueWeekScoring[]
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  if (rows.length === 0) return null
  return (
    <RecapPanel
      title="League of the Week"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      <div className="flex flex-col gap-px bg-border">
        {rows.map((row) => (
          <Row key={row.tier} row={row} compact={compact} />
        ))}
      </div>
    </RecapPanel>
  )
}
