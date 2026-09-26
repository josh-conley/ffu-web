// Single source of nav structure, shared by the desktop row (Header) and the mobile drawer
// (MobileNav). Entries are either a bare link or a labelled group rendered as a dropdown on
// desktop / a titled section in the mobile drawer.
//
// Grouping: the everyday pages stay VISIBLE in the bar — the ones you read a live season through,
// plus Members and the FFU Cup. Everything else — the cross-season analytical tables and the
// one-off/novelty pages — sits behind a single STATS & MORE menu.
//
// Revised 2026-08-21: the Cup was promoted out of the old "More" group to a top-level slot, and the
// two menus ("Stats", "More") collapsed into one. Splitting six destinations across two dropdowns
// asked people to guess which bucket a page was in; one menu is a single place to look.
//
// New pages should join the group rather than becoming an eighth top-level slot — seven is already
// tight on smaller laptops (this is exactly seven), and the flat 10-link bar is what prompted the
// grouping in the first place.
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
  // Pinned to one year internally (CUP_YEAR in config/cup.ts), so it is NOT season-scoped.
  { to: '/cup', label: 'FFU Cup', end: false },
  {
    label: 'Stats & More',
    items: [
      // Menu labels are the pages' own headings (and tab titles, via pageTitle.ts), so the link you
      // pick names the page you land on. Revised 2026-09-25: the shortened forms ("All-Time",
      // "Builds", "Lineal Champ", ...) read as different pages from the headings they opened.
      { to: '/stats', label: 'All-Time Stats', end: false },
      { to: '/records', label: 'Records', end: false },
      { to: '/players', label: 'Players', end: false },
      { to: '/around-the-union', label: 'Around the Union', end: false },
      { to: '/milestones', label: 'Milestone Watch', end: false },
      { to: '/builds', label: 'Roster Build Stats', end: false },
      { to: '/adp-comparison', label: 'ADP Comparison', end: false },
      { to: '/lineal', label: 'Lineal Championship', end: false },
    ],
  },
]

/** Every linkable destination, flattened — for anything that needs the routes without the shape. */
export const NAV_LINKS: readonly NavItem[] = NAV.flatMap((entry) => (isGroup(entry) ? entry.items : [entry]))
