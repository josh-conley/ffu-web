import type { SeriesStanding } from '@/selectors'
import { seriesHeadline } from './seriesText'

/**
 * The series in a line ("STA leads all-time 5–4"), with its last word (the score) kept whole: a
 * narrow column would otherwise break after the dash and strand the "4" on a line of its own.
 */
export function SeriesHeadline({ standing, className = '' }: { standing: SeriesStanding; className?: string }) {
  const text = seriesHeadline(standing)
  const cut = text.lastIndexOf(' ')
  return (
    <span className={className}>
      {text.slice(0, cut + 1)}
      <span className="whitespace-nowrap">{text.slice(cut + 1)}</span>
    </span>
  )
}

/** One-line all-time series tag ("STA leads all-time 5–4") for a lineup modal's header. */
export function SeriesTag({ standing }: { standing: SeriesStanding }) {
  return <SeriesHeadline standing={standing} className="font-semibold normal-case tracking-normal opacity-90" />
}
