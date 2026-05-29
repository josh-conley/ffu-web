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
}

export const LEAGUE_STYLES: Record<Tier, LeagueStyle> = {
  PREMIER: {
    label: 'Premier',
    badge: 'bg-premier-bg text-premier-fg',
    dot: 'bg-premier',
    solidHeader: 'bg-premier text-black',
  },
  MASTERS: {
    label: 'Masters',
    badge: 'bg-masters-bg text-masters-fg',
    dot: 'bg-masters',
    solidHeader: 'bg-masters text-white',
  },
  NATIONAL: {
    label: 'National',
    badge: 'bg-national-bg text-national-fg',
    dot: 'bg-national',
    solidHeader: 'bg-national text-white',
  },
}
