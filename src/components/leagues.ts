import type { Tier } from '@/config'

// Single source of truth for tier presentation (Charter DRY — was copy-pasted across pages in the
// old app). Premier (top) = amber/gold, Masters = sky, National = emerald.
export interface LeagueStyle {
  label: string
  /** Tailwind classes for a filled badge. */
  badge: string
  /** Accent dot / bar color. */
  dot: string
}

export const LEAGUE_STYLES: Record<Tier, LeagueStyle> = {
  PREMIER: {
    label: 'Premier',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  MASTERS: {
    label: 'Masters',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  NATIONAL: {
    label: 'National',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
}
