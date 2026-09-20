import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { LEAGUE_STYLES } from './leagues'
import { SELECT } from './controls'

// Year dropdown + tier buttons. Tiers shown reflect what existed that year (ESPN era had no
// Masters). Reused by every season-scoped page.
//
// `union` adds one more button beside the tiers, for a page that can also show the whole Union at
// once (Standings' 36-team view). It is a separate prop rather than a fourth Tier: the Union is not
// a league — no season file, no promotion, nothing else in the app can load one — and widening
// `Tier` would put a case with no data behind it on every page that takes a tier.

/** The optional cross-league scope button: whether it is selected, and what to do when picked. */
export interface UnionScope {
  active: boolean
  onSelect: () => void
}

const BUTTON =
  'inline-flex min-h-11 items-center border px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0'
const UNSELECTED = 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-text'
export function SeasonLeaguePicker({
  years,
  year,
  tier,
  onYear,
  onTier,
  union,
}: {
  years: string[]
  year: string
  tier: Tier
  onYear: (year: string) => void
  onTier: (tier: Tier) => void
  union?: UnionScope
}) {
  const tiers = tiersForYear(year)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={year}
        onChange={(e) => onYear(e.target.value)}
        aria-label="Season year"
        className={SELECT}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <div className="flex gap-1" role="group" aria-label="League tier">
        {tiers.map((t) => {
          const selected = t === tier && union?.active !== true
          return (
            <button
              key={t}
              type="button"
              onClick={() => onTier(t)}
              aria-pressed={selected}
              className={`${BUTTON} ${selected ? `border-transparent ${LEAGUE_STYLES[t].solidHeader}` : UNSELECTED}`}
            >
              {LEAGUE_STYLES[t].label}
            </button>
          )
        })}
        {union && (
          <button
            type="button"
            onClick={union.onSelect}
            aria-pressed={union.active}
            title="All three leagues in one table"
            className={`${BUTTON} ${union.active ? 'border-transparent bg-accent text-accent-fg' : UNSELECTED}`}
          >
            Union
          </button>
        )}
      </div>
    </div>
  )
}
