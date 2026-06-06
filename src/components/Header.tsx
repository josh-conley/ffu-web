import { Fragment } from 'react'
import { NavLink } from 'react-router-dom'
import { useNavHref } from '@/hooks/useNavHref'
import { ThemeToggle } from './ThemeToggle'
import { MobileNav } from './MobileNav'
import { NAV } from './nav'

// The header is intentionally ALWAYS dark (independent of the light/dark theme), so its colors are
// fixed near-black + white rather than theme tokens. The FFU red identity stays in the bottom rule
// and the active nav tab.
export function Header() {
  const hrefFor = useNavHref()
  return (
    <header className="sticky top-0 z-20 border-b-2 border-accent bg-[#0a0a0b]">
      {/* Full-width (no max-w cap): the brand subtext + 7-item nav need the whole width on desktop,
          otherwise they collide inside a 1024px container and the subtext truncates. */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <img src="/ffu-logo.png" alt="FFU" className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-xl font-extrabold uppercase italic tracking-tight text-white sm:text-2xl">FFU</span>
            <span className="mt-0.5 truncate text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-white/75 sm:text-[0.6rem] sm:tracking-[0.2em]">
              Fantasy Football Union
            </span>
          </span>
        </NavLink>
        {/* Desktop nav row (>=md). Below md the hamburger drawer takes over. */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => (
            <Fragment key={item.to}>
              {item.startGroup && <span aria-hidden className="mx-1.5 h-5 w-px bg-white/15" />}
              <NavLink
                to={hrefFor(item)}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                    isActive
                      ? 'angular-sm bg-accent text-accent-fg'
                      : 'rounded-md text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </Fragment>
          ))}
          <ThemeToggle />
        </nav>
        {/* Mobile controls (<md): theme toggle + hamburger. */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  )
}
