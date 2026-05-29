import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { LEAGUE_STYLES } from './leagues'
import { SELECT } from './controls'

// Year dropdown + tier buttons. Tiers shown reflect what existed that year (ESPN era had no
// Masters). Reused by every season-scoped page.
export function SeasonLeaguePicker({
  years,
  year,
  tier,
  onYear,
  onTier,
}: {
  years: string[]
  year: string
  tier: Tier
  onYear: (year: string) => void
  onTier: (tier: Tier) => void
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
        {tiers.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTier(t)}
            aria-pressed={t === tier}
            className={`inline-flex min-h-11 items-center border px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0 ${
              t === tier
                ? `border-transparent ${LEAGUE_STYLES[t].solidHeader}`
                : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-text'
            }`}
          >
            {LEAGUE_STYLES[t].label}
          </button>
        ))}
      </div>
    </div>
  )
}
