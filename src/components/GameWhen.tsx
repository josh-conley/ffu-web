import type { Tier } from '@/config'
import { LeagueBadge } from './LeagueBadge'

/**
 * When a game happened: year · tier · round-or-week. One home for the "2024 [Premier] Wk 6" label
 * shared by every view that points at a single game (Records, Lineal Championship).
 */
export function GameWhen({ year, tier, week, round }: { year: string; tier: Tier; week: number; round?: string }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap text-muted">
      <span className="tabular-nums">{year}</span>
      <LeagueBadge tier={tier} />
      <span>{round ?? `Wk ${week}`}</span>
    </span>
  )
}
