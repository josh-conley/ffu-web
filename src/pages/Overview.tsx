import { useMemo } from 'react'
import type { SeasonData } from '@/data'
import type { Tier } from '@/config'
import { nameForYear } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { LeagueBadge } from '@/components/LeagueBadge'
import { TeamLogo } from '@/components/TeamLogo'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const TIERS: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

const championOf = (season: SeasonData) => season.teams.find((t) => t.finalPlacement === 1)?.memberId

export function Overview() {
  const { data: seasons, loading, error } = useAllSeasons()
  const { years, champions } = useMemo(() => {
    const champions = new Map<string, string>() // `${year}|${tier}` -> memberId
    const yearSet = new Set<string>()
    for (const s of seasons ?? []) {
      yearSet.add(s.year)
      const id = championOf(s)
      if (id) champions.set(`${s.year}|${s.tier}`, id)
    }
    return { years: [...yearSet].sort().reverse(), champions }
  }, [seasons])

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Fantasy Football Union</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">{years.length} seasons · champions by tier</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Year</th>
              {TIERS.map((t) => (
                <th key={t} className="px-3 py-2 text-left">
                  <LeagueBadge tier={t} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {years.map((year) => (
              <tr key={year} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-3 py-2 font-medium tabular-nums">{year}</td>
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
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
