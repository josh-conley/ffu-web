import { CUP_NAME, getMember, type Tier } from '@/config'
import { LEAGUE_STYLES } from './leagues'
import { NAV_LINKS } from './nav'

// The browser-tab title for every route, from one place. Page names come from nav.ts (the menu
// label IS the page's name), so the tab, the menu and the heading can't drift apart again. Only the
// routes the nav doesn't list are named here.

export const SITE_NAME = 'Fantasy Football Union'
const SUFFIX = 'FFU'

/** Reachable pages the nav leaves out (the Cup draw is unlisted on purpose). */
const UNLISTED: Record<string, string> = { '/cup/draw': `${CUP_NAME} Draw` }

/** The season a season-scoped page is showing, as it resolves it (URL, else its default). */
export interface TitleSeason {
  year: string
  tier: Tier
}

const join = (...parts: string[]) => [...parts, SUFFIX].join(' · ')

/** Pathname without a trailing slash (but "/" stays "/"). */
const normalise = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname)

/** "2026 Premier", or "2026 Union" for the Standings page's all-leagues scope. */
function seasonPart(season: TitleSeason, params: URLSearchParams): string {
  const scope = params.get('scope') === 'union' ? 'Union' : LEAGUE_STYLES[season.tier].label
  return `${season.year} ${scope}`
}

/**
 * e.g. "Standings · 2026 Premier · FFU", "Josh's Team · Members · FFU", "Page Not Found · FFU".
 * `season` is omitted until the page's season is known; the title then just names the page.
 */
export function pageTitle(pathname: string, params: URLSearchParams, season?: TitleSeason): string {
  const path = normalise(pathname)
  if (path === '/') return SITE_NAME
  const unlisted = UNLISTED[path]
  if (unlisted) return join(unlisted)

  const item = NAV_LINKS.find((link) => link.to === path)
  if (!item) return join('Page Not Found')

  const member = path === '/members' ? getMember(params.get('member') ?? '') : undefined
  if (member) return join(member.name, item.label)
  if (item.seasonScoped && season) return join(item.label, seasonPart(season, params))
  return join(item.label)
}

