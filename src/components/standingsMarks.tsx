import type { PlayoffBerth, SeasonMove } from '@/selectors'

// The small marks the Standings tables add to a row — shared by the Standings page and the home
// page's per-league summary so both say the same thing the same way. Every mark carries its meaning
// in text (a glyph plus an accessible name), never in color alone.

const MOVES: Record<SeasonMove, { glyph: string; verb: string; direction: string; className: string }> = {
  promoted: { glyph: '↑', verb: 'Promoted', direction: 'up', className: 'text-positive' },
  relegated: { glyph: '↓', verb: 'Relegated', direction: 'down', className: 'text-negative' },
}

/** ↑ or ↓ beside a team a finished season moved. Says "up/down a league" rather than naming the
 *  league, because the 2022 expansion sent some teams further than one step. */
export function MoveMark({ move, year }: { move: SeasonMove; year: string }) {
  const m = MOVES[move]
  const label = `${m.verb}: ${m.direction} a league for ${Number(year) + 1}`
  return (
    <span role="img" aria-label={label} title={label} className={`shrink-0 font-bold ${m.className}`}>
      {m.glyph}
    </span>
  )
}

const BERTHS: Record<PlayoffBerth, { short: string; long: string }> = {
  division: { short: 'DIV', long: 'Division leader' },
  wildcard: { short: 'WC', long: 'Wildcard' },
}

/** How a team is in the playoffs "if the season ended today". */
export function BerthTag({ berth }: { berth: PlayoffBerth }) {
  const b = BERTHS[berth]
  return (
    <span role="img" aria-label={b.long} title={`${b.long}: in the playoffs if the season ended today`} className="shrink-0 border border-border px-1 text-[9px] font-bold leading-tight tracking-wider text-muted">
      {b.short}
    </span>
  )
}

/** The divider's label. Below the playoff line every team plays the Toilet Bowl, whose two losers
 *  go down — so in a league with relegation the same line is also where the zone starts. */
export function CutLabel({ relegation }: { relegation: boolean }) {
  if (!relegation) return <span>▲ Playoff line</span>
  return (
    <span title="Everyone below the line plays the Toilet Bowl; its two losers are relegated">
      ▲ Playoff line <span aria-hidden>·</span> Relegation zone ▼
    </span>
  )
}
