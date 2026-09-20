import { FaArrowTrendUp, FaCoins, FaFireFlameCurved, FaShieldHalved } from 'react-icons/fa6'
import type { MilestoneCategory } from '@/selectors'

/**
 * Single source of milestone presentation (Charter DRY) — how each category is named, described and
 * formatted. The thresholds themselves are facts and live in the selector; "$1,500" versus
 * "1,500.00" is a display choice and lives here, beside the label that introduces it.
 */
export interface MilestoneMeta {
  label: string
  blurb: string
  icon: React.ReactNode
}

export const MILESTONE_META: Record<MilestoneCategory, MilestoneMeta> = {
  pointsFor: { label: 'Points Scored', blurb: 'Career points for, across every league.', icon: <FaArrowTrendUp aria-hidden /> },
  wins: { label: 'Career Wins', blurb: 'Regular season and playoffs, all leagues.', icon: <FaFireFlameCurved aria-hidden /> },
  earnings: { label: 'Career Earnings', blurb: 'Every prize won, including cross-league prizing.', icon: <FaCoins aria-hidden /> },
  pointsAgainst: { label: 'Points Against', blurb: 'The other kind of milestone.', icon: <FaShieldHalved aria-hidden /> },
}

/** How each category's numbers read. */
export const MILESTONE_FORMAT: Record<MilestoneCategory, (n: number) => string> = {
  pointsFor: (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  pointsAgainst: (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  wins: (n) => String(Math.round(n)),
  earnings: (n) => `$${Math.round(n).toLocaleString('en-US')}`,
}
