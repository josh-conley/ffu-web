import type { Tier } from '@/config'
import { LEAGUE_STYLES } from './leagues'

/** @param rank Optional placement INSIDE that league, for views that mix the tiers (Union standings). */
export function LeagueBadge({ tier, rank }: { tier: Tier; rank?: number }) {
  const style = LEAGUE_STYLES[tier]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}>
      {style.label}
      {rank !== undefined && <span className="font-bold tabular-nums opacity-80">#{rank}</span>}
    </span>
  )
}
