import { MEMBERS } from '@/config'
import { NAV_LINKS } from './nav'
import { pageTitle, SITE_NAME } from './pageTitle'

const at = (path: string, query = '', season?: Parameters<typeof pageTitle>[2]) =>
  pageTitle(path, new URLSearchParams(query), season)

describe('pageTitle', () => {
  it('names the home page after the site', () => {
    expect(at('/')).toBe(SITE_NAME)
  })

  it('titles every nav page with its menu label, so the tab and the menu agree', () => {
    for (const link of NAV_LINKS.filter((l) => l.to !== '/')) {
      expect(at(link.to)).toBe(`${link.label} · FFU`)
    }
  })

  it('adds the season a season-scoped page is showing', () => {
    expect(at('/standings', '', { year: '2026', tier: 'PREMIER' })).toBe('Standings · 2026 Premier · FFU')
    expect(at('/drafts', 'year=2021&tier=MASTERS', { year: '2021', tier: 'MASTERS' })).toBe('Drafts · 2021 Masters · FFU')
  })

  it("calls the Standings page's all-leagues scope the Union", () => {
    expect(at('/standings', 'scope=union', { year: '2025', tier: 'PREMIER' })).toBe('Standings · 2025 Union · FFU')
  })

  it('ignores a season on pages that are not season-scoped', () => {
    expect(at('/records', '', { year: '2026', tier: 'PREMIER' })).toBe('Records · FFU')
  })

  it("puts the member's name first on their profile", () => {
    const member = MEMBERS[0]!
    expect(at('/members', `member=${member.ffuId}`)).toBe(`${member.name} · Members · FFU`)
    expect(at('/members', 'member=nobody')).toBe('Members · FFU')
  })

  it('names the unlisted Cup draw, tolerates a trailing slash, and flags unknown paths', () => {
    expect(at('/cup/draw')).toBe('FFU Cup Draw · FFU')
    expect(at('/records/')).toBe('Records · FFU')
    expect(at('/nope')).toBe('Page Not Found · FFU')
  })
})
