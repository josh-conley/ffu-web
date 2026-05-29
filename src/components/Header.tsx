import { NavLink } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { MobileNav } from './MobileNav'
import { NAV } from './nav'

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b-2 border-accent bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2.5">
          <img src="/ffu-logo.png" alt="FFU" className="h-11 w-11" />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-2xl font-extrabold uppercase italic tracking-tight text-accent">FFU</span>
            <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted">
              Fantasy Football Union
            </span>
          </span>
        </NavLink>
        {/* Desktop nav row (>=md). Below md the hamburger drawer takes over. */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text ${
                  isActive
                    ? 'angular-sm bg-accent text-accent-fg'
                    : 'rounded-md text-muted hover:bg-surface-2 hover:text-text'
                }`
              }
            >
              {item.label}
            </NavLink>
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
