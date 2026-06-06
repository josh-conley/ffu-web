import type { Tier } from '@/config'
import { nameForYear } from '@/config'
import { LEAGUE_STYLES } from './leagues'
import { TeamLogo } from './TeamLogo'

const TIERS: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

/**
 * Champions grouped into one card per league (newest year first). Stacks vertically on mobile —
 * no horizontal scroll — and spreads to columns on wider screens. `champions` keyed `${year}|${tier}`.
 */
export function ChampionsByLeague({ years, champions }: { years: string[]; champions: Map<string, string> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TIERS.map((tier) => {
        const rows = years
          .map((year) => ({ year, id: champions.get(`${year}|${tier}`) }))
          .filter((r): r is { year: string; id: string } => r.id !== undefined)
        if (rows.length === 0) return null
        return (
          <section key={tier} className="border border-border bg-surface shadow-sm">
            <h3 className={`px-3 py-2 text-sm font-bold uppercase tracking-wide ${LEAGUE_STYLES[tier].solidHeader}`}>
              {LEAGUE_STYLES[tier].label}
            </h3>
            <ul className="divide-y divide-border">
              {rows.map(({ year, id }) => (
                <li key={year} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                  <span className="w-10 shrink-0 font-bold tabular-nums text-muted">{year}</span>
                  <TeamLogo ffuId={id} size={22} />
                  {/* min-w-0 lets the flex item shrink so the name truncates instead of forcing the
                      row (and the whole page) wider than the viewport. */}
                  <span className="min-w-0 truncate font-medium">{nameForYear(id, year) ?? id}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
