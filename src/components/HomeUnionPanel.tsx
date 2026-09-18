import { Link } from 'react-router-dom'
import { FaArrowRightLong } from 'react-icons/fa6'
import type { UnionHighlight } from '@/selectors'
import { AroundTheUnionBoard } from './AroundTheUnionBoard'

/**
 * Around the Union on the front door, in the FFUN layout — the newsletter's own panel, three bands
 * tall, so it earns a spot near the top of the page instead of pushing the live week down a
 * screenful. Renders nothing outside a live season (see unionHighlight).
 *
 * The week picker and the copy-as-image button live on /around-the-union rather than here: they are
 * an author's tools, and this is the reader's view of the same panel.
 */
export function HomeUnionPanel({ highlight }: { highlight: UnionHighlight | null }) {
  if (highlight === null) return null
  const { year, week, scores, race } = highlight
  return (
    <section className="space-y-2">
      <AroundTheUnionBoard year={year} week={week} scores={scores} race={race} layout="ffun" />
      <Link
        to="/around-the-union"
        className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Earlier weeks &amp; the full panel
        <FaArrowRightLong className="transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </section>
  )
}
