// Single source of nav structure, shared by the desktop row (Header) and the mobile drawer
// (MobileNav). Entries are either a bare link or a labelled group rendered as a dropdown on
// desktop / a titled section in the mobile drawer.
//
// Grouping (agreed with the user, 2026-07-31): the five everyday pages stay VISIBLE in the bar —
// the four you read a live season through, plus Members. The rest group by kind: STATS = the
// cross-season analytical tables, which are near-identical in shape and were the confusing part of
// the flat bar; MORE = one-off and novelty pages.
//
// New pages should join a group rather than becoming an eighth top-level slot — seven is already
// tight on smaller laptops, and the flat 10-link bar is what prompted the grouping.
export interface NavItem {
  to: string
  label: string
  end: boolean
  /**
   * Season-scoped pages read `?year=&tier=` from the URL. When true, navigating here carries the
   * current season context (see `useNavHref`) so one season can be explored across Standings /
   * Matchups / Drafts without resetting to the latest.
   */
  seasonScoped?: boolean
}

export interface NavGroup {
  label: string
  items: readonly NavItem[]
}

export type NavEntry = NavItem | NavGroup

export const isGroup = (entry: NavEntry): entry is NavGroup => 'items' in entry

export const NAV: readonly NavEntry[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/standings', label: 'Standings', end: false, seasonScoped: true },
  { to: '/matchups', label: 'Matchups', end: false, seasonScoped: true },
  { to: '/drafts', label: 'Drafts', end: false, seasonScoped: true },
  { to: '/members', label: 'Members', end: false },
  {
    label: 'Stats',
    items: [
      // Named "All-Time" in the menu: the group is already called Stats, so repeating the word
      // would make the page indistinguishable from its own heading.
      { to: '/stats', label: 'All-Time', end: false },
      { to: '/records', label: 'Records', end: false },
      { to: '/builds', label: 'Builds', end: false },
    ],
  },
  {
    label: 'More',
    items: [
      { to: '/lineal', label: 'Lineal', end: false },
      // Pinned to one year internally (see pages/Tournament.tsx), so it is NOT season-scoped.
      { to: '/tournament', label: 'Tournament', end: false },
    ],
  },
]

/** Every linkable destination, flattened — for anything that needs the routes without the shape. */
export const NAV_LINKS: readonly NavItem[] = NAV.flatMap((entry) => (isGroup(entry) ? entry.items : [entry]))
