import type { Tier } from '@/config'
import { LEAGUE_STYLES } from './leagues'

export function LeagueBadge({ tier }: { tier: Tier }) {
  const style = LEAGUE_STYLES[tier]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}>
      {style.label}
    </span>
  )
}
