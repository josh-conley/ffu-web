import { Link } from 'react-router-dom'
import { FaArrowRightLong, FaNewspaper } from 'react-icons/fa6'
import { nameForYear } from '@/config'
import type { UnionHighlight } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'

/**
 * Front-door pointer to /around-the-union, shown once a week has been completed. Leads with the
 * week's top score rather than a bare link — it is the one number the newsletter opens with, and a
 * teaser that already tells you something is worth the row it takes on the home page.
 */
export function AroundTheUnionTeaser({ highlight }: { highlight: UnionHighlight | null }) {
  if (highlight === null) return null
  const { year, week, leader } = highlight
  const style = LEAGUE_STYLES[leader.tier]
  return (
    <Link
      to="/around-the-union"
      className="group flex items-center gap-4 border border-border bg-surface p-4 shadow-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <FaNewspaper className="shrink-0 text-2xl text-accent" aria-hidden />
      <div className="min-w-0">
        <div className="font-extrabold uppercase tracking-tight">Around the Union — Week {week}</div>
        <div className="text-sm text-muted">
          <span className="font-semibold text-text">{nameForYear(leader.memberId, year) ?? leader.memberId}</span> topped
          the Union with{' '}
          <span className="font-mono font-semibold tabular-nums text-text">{leader.score.toFixed(2)}</span> in{' '}
          <span className={`font-semibold ${style.text}`}>{style.label}</span>. Plus the league scoring race.
        </div>
      </div>
      <FaArrowRightLong className="ml-auto shrink-0 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  )
}
