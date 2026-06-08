// Single source of nav items, shared by the desktop row (Header) and the mobile drawer
// (MobileNav). Only routes that exist are linked (grows as pages land).
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
  /** Render a group separator before this item (visually splits season views from history). */
  startGroup?: boolean
}

export const NAV: readonly NavItem[] = [
  { to: '/', label: 'Overview', end: true },
  { to: '/standings', label: 'Standings', end: false, seasonScoped: true, startGroup: true },
  { to: '/matchups', label: 'Matchups', end: false, seasonScoped: true },
  { to: '/drafts', label: 'Drafts', end: false, seasonScoped: true },
  { to: '/records', label: 'Records', end: false, startGroup: true },
  { to: '/members', label: 'Members', end: false },
  { to: '/stats', label: 'Stats', end: false },
]
