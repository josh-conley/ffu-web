import { Link } from 'react-router-dom'
import { FaArrowRightLong, FaTrophy } from 'react-icons/fa6'
import { CUP_ACCENT, CUP_NAME, CUP_YEAR } from '@/config'

/**
 * Front-door promo for the FFU Cup. Whole banner is the link. Carries the Cup's own accent rather
 * than the site red, so it reads as a doorway to that competition — the page it lands on is themed
 * the same way.
 */
export function CupBanner() {
  return (
    <Link
      to="/cup"
      className="group flex items-center gap-4 border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ borderColor: `${CUP_ACCENT}66`, backgroundColor: `${CUP_ACCENT}1a` }}
    >
      <FaTrophy className="shrink-0 text-2xl" aria-hidden style={{ color: CUP_ACCENT }} />
      <div className="min-w-0">
        <div className="font-extrabold uppercase tracking-tight">
          New — The {CUP_NAME}
        </div>
        <div className="text-sm text-muted">
          All 36 teams, three leagues, one knockout bracket — new for {CUP_YEAR}. The format, the draw, and
          what it pays.
        </div>
      </div>
      <FaArrowRightLong className="ml-auto shrink-0 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  )
}
