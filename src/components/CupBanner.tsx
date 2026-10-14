import { Link } from 'react-router-dom'
import { FaArrowRightLong, FaTrophy } from 'react-icons/fa6'
import { CUP_ACCENT, CUP_NAME, CUP_YEAR } from '@/config'

/**
 * The home page's door to the FFU Cup bracket, at the top of the page. One line on purpose: it sits
 * above the live matchups, which are what people come for on a game day, so it costs them a row
 * rather than a screen. Whole banner is the link, in the Cup's own accent rather than the site red,
 * so it reads as a doorway to that competition (the page it lands on is themed the same way).
 */
export function CupBanner() {
  return (
    <Link
      to="/cup"
      className="group flex items-center gap-3 border px-4 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ borderColor: `${CUP_ACCENT}66`, backgroundColor: `${CUP_ACCENT}1a` }}
    >
      <FaTrophy className="shrink-0 text-lg" aria-hidden style={{ color: CUP_ACCENT }} />
      <span className="min-w-0 font-extrabold uppercase tracking-tight">
        {CUP_YEAR} {CUP_NAME} <span className="font-semibold normal-case text-muted">· See the bracket</span>
      </span>
      <FaArrowRightLong className="ml-auto shrink-0 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  )
}
