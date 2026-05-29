import { NavLink } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

// Nav grows as pages land (Phase 4). Only routes that exist are linked.
const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/standings', label: 'Standings', end: false },
  { to: '/matchups', label: 'Matchups', end: false },
  { to: '/records', label: 'Records', end: false },
  { to: '/members', label: 'Members', end: false },
]

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-lg">Fantasy Football Union</span>
        </NavLink>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
