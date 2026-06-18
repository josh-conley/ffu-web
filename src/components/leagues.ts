import type { Tier } from '@/config'

// Single source of truth for tier presentation (Charter DRY — was copy-pasted across pages in the
// old app). Colors mirror the old FFU site identity: Premier = gold, Masters = purple, National =
// red. Values resolve to semantic tokens defined in src/index.css (light + dark).
export interface LeagueStyle {
  label: string
  /** Tailwind classes for a soft filled badge. */
  badge: string
  /** Accent dot / bar color (solid tier color). */
  dot: string
  /** Solid colored header bar (e.g. Standings tier sections). */
  solidHeader: string
  /** Tier color as text / icon foreground (e.g. a championship trophy). */
  text: string
  /** Tier color as a border (e.g. the draft board's header rule). */
  border: string
}

/** Tiers in prestige order (top flight first) — for views that rank accomplishments across tiers. */
export const TIER_PRESTIGE: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

export const LEAGUE_STYLES: Record<Tier, LeagueStyle> = {
  PREMIER: {
    label: 'Premier',
    badge: 'bg-premier-bg text-premier-fg',
    dot: 'bg-premier',
    solidHeader: 'bg-premier text-black',
    text: 'text-premier',
    border: 'border-premier',
  },
  MASTERS: {
    label: 'Masters',
    badge: 'bg-masters-bg text-masters-fg',
    dot: 'bg-masters',
    solidHeader: 'bg-masters text-white',
    text: 'text-masters',
    border: 'border-masters',
  },
  NATIONAL: {
    label: 'National',
    badge: 'bg-national-bg text-national-fg',
    dot: 'bg-national',
    solidHeader: 'bg-national text-white',
    text: 'text-national',
    border: 'border-national',
  },
}
