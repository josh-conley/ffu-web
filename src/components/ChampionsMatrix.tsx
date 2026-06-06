import type { Tier } from '@/config'
import { nameForYear } from '@/config'
import { LeagueBadge } from './LeagueBadge'
import { TeamLogo } from './TeamLogo'

const TIERS: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

/** The full year × tier champions grid (every season). `champions` is keyed `${year}|${tier}`. */
export function ChampionsMatrix({ years, champions }: { years: string[]; champions: Map<string, string> }) {
  return (
    <div className="overflow-x-auto border border-border bg-surface shadow-sm">
      <table className="w-max min-w-full text-sm">
        <thead className="border-b border-border bg-surface-2">
          <tr>
            <th scope="col" className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-muted">Year</th>
            {TIERS.map((t) => (
              <th key={t} scope="col" className="px-3 py-2.5 text-left">
                <LeagueBadge tier={t} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {years.map((year) => (
            <tr key={year} className="hover:bg-surface-2">
              <td className="px-3 py-2 font-bold tabular-nums">{year}</td>
              {TIERS.map((tier) => {
                const id = champions.get(`${year}|${tier}`)
                return (
                  <td key={tier} className="px-3 py-2">
                    {id ? (
                      <span className="flex items-center gap-2">
                        <TeamLogo ffuId={id} size={22} />
                        {nameForYear(id, year) ?? id}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
