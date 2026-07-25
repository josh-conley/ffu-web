import { Link } from 'react-router-dom'
import { FaArrowRightLong, FaChartColumn } from 'react-icons/fa6'

/** Front-door promo linking to the new Roster Build Stats tool. Whole banner is the link. */
export function RosterBuildsBanner() {
  return (
    <Link
      to="/builds"
      className="group flex items-center gap-4 border border-accent/40 bg-accent/10 p-4 transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <FaChartColumn className="shrink-0 text-2xl text-accent" aria-hidden />
      <div className="min-w-0">
        <div className="font-extrabold uppercase tracking-tight">
          New — Roster Build Stats
        </div>
        <div className="text-sm text-muted">
          Which draft builds actually win? Roster construction vs. finish, across every draft.
        </div>
      </div>
      <FaArrowRightLong className="ml-auto shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" aria-hidden />
    </Link>
  )
}
