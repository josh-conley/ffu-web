import type { CompareSide, SeasonFinish, SeriesBreakdown, WeeklySeries, WinLoss } from '@/selectors'
import { HARDWARE } from '../hardware'
import { LEAGUE_STYLES, TIER_PRESTIGE } from '../leagues'
import { ordinal } from '../format'
import { teamAbbr } from '../seriesText'

// Both careers year by year on one strip: a chip per season in that season's league color, holding
// where they finished (a trophy for a title), and under them how the pair's games went that year.
// Reads promotion and relegation for both at once, which two separate timelines can't.

const yearLabel = (year: string) => `’${year.slice(2)}`

function Chip({ finish }: { finish: SeasonFinish | undefined }) {
  if (!finish) return <span className="text-muted" aria-label="Did not play">—</span>
  const style = LEAGUE_STYLES[finish.tier]
  const place = finish.finalPlacement
  const Trophy = HARDWARE.title.icon
  const label = `${finish.year} · ${style.label} · ${place === null ? 'in progress' : `${ordinal(place)} of ${finish.seasonSize}`}`
  return (
    <span title={label} aria-label={label} className={`inline-flex size-7 items-center justify-center text-xs font-bold tabular-nums ${style.badge}`}>
      {place === 1 ? <Trophy size={13} aria-hidden /> : (place ?? '…')}
    </span>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {TIER_PRESTIGE.map((tier) => (
        <span key={tier} className="inline-flex items-center gap-1.5">
          <span className={`size-2.5 ${LEAGUE_STYLES[tier].dot}`} aria-hidden />
          {LEAGUE_STYLES[tier].label}
        </span>
      ))}
    </div>
  )
}

const wl = (r: WinLoss | undefined) => (r ? `${r.wins}–${r.losses}${r.ties > 0 ? `–${r.ties}` : ''}` : '')

/** A row of one record per year, under the two teams' chips. */
function YearRow({ label, title, years, byYear }: { label: string; title: string; years: string[]; byYear: Record<string, WinLoss> }) {
  return (
    <tr className="text-xs text-muted">
      <th scope="row" title={title} className="sticky left-0 bg-surface px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider">{label}</th>
      {years.map((y) => (
        <td key={y} className="px-1 py-1.5 text-center font-mono tabular-nums">{wl(byYear[y])}</td>
      ))}
    </tr>
  )
}

export function SeasonStrip({ a, b, years, series, weekly }: { a: CompareSide; b: CompareSide; years: string[]; series: SeriesBreakdown; weekly: WeeklySeries }) {
  const finishIn = (side: CompareSide, year: string) => side.career.finishes.find((f) => f.year === year)
  const CELL = 'px-1 py-1.5 text-center'
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <caption className="sr-only">Season by season</caption>
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wider text-muted">
              <th scope="col" className="sticky left-0 bg-surface px-3 py-2 text-left">Team</th>
              {years.map((y) => (
                <th key={y} scope="col" title={y} className={`${CELL} tabular-nums`}>{yearLabel(y)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[a, b].map((side) => (
              <tr key={side.memberId}>
                <th scope="row" className="sticky left-0 bg-surface px-3 py-1.5 text-left text-xs font-bold">{teamAbbr(side.memberId)}</th>
                {years.map((y) => (
                  <td key={y} className={CELL}><Chip finish={finishIn(side, y)} /></td>
                ))}
              </tr>
            ))}
            <YearRow label="H2H" title="Their games against each other that year" years={years} byYear={series.byYear} />
            <YearRow label="Every wk" title="Every regular-season week both played that year, as if against each other" years={years} byYear={weekly.byYear} />
          </tbody>
        </table>
      </div>
      <Legend />
    </div>
  )
}
