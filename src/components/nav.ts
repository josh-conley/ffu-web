// Single source of nav items, shared by the desktop row (Header) and the mobile drawer
// (MobileNav). Only routes that exist are linked (grows as pages land).
export interface NavItem {
  to: string
  label: string
  end: boolean
}

export const NAV: readonly NavItem[] = [
  { to: '/', label: 'Overview', end: true },
  { to: '/standings', label: 'Standings', end: false },
  { to: '/matchups', label: 'Matchups', end: false },
  { to: '/records', label: 'Records', end: false },
  { to: '/drafts', label: 'Drafts', end: false },
  { to: '/members', label: 'Members', end: false },
  { to: '/all-time', label: 'All-Time', end: false },
]
