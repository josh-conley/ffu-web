import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Header } from './Header'
import { NAV, NAV_LINKS, isGroup } from './nav'

/**
 * Renders the header with a persistent userEvent instance. `setup()` matters here: it keeps pointer
 * state across calls, so hovering B after A fires the pointerleave on A that a real mouse would.
 * The bare `userEvent.hover()` helpers each start from a fresh pointer and never emit that leave.
 */
/** The bar's only dropdown. Anchored so it can't also match a nav link of the same words. */
const GROUP = /^Stats & More/

function renderAt(path: string) {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  )
  return user
}

describe('nav structure', () => {
  it('exposes every route exactly once across the groups', () => {
    const paths = NAV_LINKS.map((i) => i.to)
    expect(new Set(paths).size).toBe(paths.length)
    // The Cup has its own top-level slot (2026-08-21), not a menu entry.
    expect(paths).toContain('/cup')
    expect(paths).toHaveLength(10)
  })

  it('has a single dropdown, so no one has to guess which menu a page is under', () => {
    expect(NAV.filter(isGroup).map((g) => g.label)).toEqual(['Stats & More'])
    // ...and the Cup sits in the bar itself.
    expect(NAV.filter((e) => !isGroup(e)).map((e) => e.label)).toContain('FFU Cup')
  })

  it('marks only the three season views as season-scoped', () => {
    const scoped = NAV_LINKS.filter((i) => i.seasonScoped).map((i) => i.to)
    expect(scoped).toEqual(['/standings', '/matchups', '/drafts'])
  })
})

describe('Header dropdowns', () => {
  it('keeps the everyday pages in the bar and the grouped ones behind a menu', async () => {
    const user = renderAt('/')
    for (const label of ['Home', 'Standings', 'Matchups', 'Drafts', 'Members', 'FFU Cup']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.queryByRole('link', { name: 'Records' })).not.toBeInTheDocument()

    await user.hover(screen.getByRole('button', { name: GROUP }))
    expect(screen.getByRole('link', { name: 'Records' })).toBeInTheDocument()
  })


  it('opens on mouse hover and closes when the pointer leaves', async () => {
    const user = renderAt('/')
    const trigger = screen.getByRole('button', { name: GROUP })

    await user.hover(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Lineal Champ' })).toBeInTheDocument()

    await user.unhover(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Lineal Champ' })).not.toBeInTheDocument()
  })

  it('a click on a hover-opened menu pins it instead of closing it', async () => {
    const user = renderAt('/')
    const trigger = screen.getByRole('button', { name: GROUP })

    await user.hover(trigger)
    await user.click(trigger)
    expect(screen.getByRole('link', { name: 'Lineal Champ' })).toBeInTheDocument()
  })

  it('toggles on keyboard activation, where there is no pointer to hover with', async () => {
    const user = renderAt('/')
    const trigger = screen.getByRole('button', { name: GROUP })
    trigger.focus()

    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('carries the current season context onto season-scoped links only', () => {
    renderAt('/standings?year=2021&tier=MASTERS')

    expect(screen.getByRole('link', { name: 'Matchups' })).toHaveAttribute('href', '/matchups?year=2021&tier=MASTERS')
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('href', '/members')

    // The Cup is a top-level link now, and unscoped: it must NOT pick up the season params.
    expect(screen.getByRole('link', { name: 'FFU Cup' })).toHaveAttribute('href', '/cup')
  })

  it('shows the group as active while you are on one of its pages', () => {
    renderAt('/lineal')
    expect(screen.getByRole('button', { name: GROUP })).toHaveClass('bg-accent')
  })

  it('does not light the group up for a top-level page', () => {
    renderAt('/cup')
    expect(screen.getByRole('button', { name: GROUP })).not.toHaveClass('bg-accent')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = renderAt('/')
    const trigger = screen.getByRole('button', { name: GROUP })

    await user.hover(trigger)
    expect(screen.getByRole('link', { name: 'Lineal Champ' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: 'Lineal Champ' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('anchors panels to the right so they never overflow the viewport', async () => {
    // Regression: the rightmost menu (then "More") was left-anchored and wider than its trigger, which
    // pushed it past the viewport edge and made the whole page horizontally scrollable. jsdom has
    // no layout, so this guards the anchoring class that fixes it.
    const user = renderAt('/')
    const trigger = screen.getByRole('button', { name: GROUP })

    await user.hover(trigger)
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!)
    expect(panel).toHaveClass('right-0')
    expect(panel).not.toHaveClass('left-0')
  })

  it('renders bare entries inline and one trigger per group', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    for (const entry of NAV.filter(isGroup)) {
      expect(screen.getByRole('button', { name: new RegExp(entry.label) })).toHaveAttribute('aria-expanded', 'false')
    }
  })
})
