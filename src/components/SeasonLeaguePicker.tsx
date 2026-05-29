import type { Tier } from '@/config'
import { tiersForYear } from '@/config'
import { LEAGUE_STYLES } from './leagues'

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
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
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
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              t === tier
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {LEAGUE_STYLES[t].label}
          </button>
        ))}
      </div>
    </div>
  )
}
