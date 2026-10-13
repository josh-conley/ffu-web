import type { SeriesStanding } from '@/selectors'
import { seriesHeadline } from './seriesText'

/** One-line all-time series tag ("STA leads all-time 5–4") for a lineup modal's header. */
export function SeriesTag({ standing }: { standing: SeriesStanding }) {
  return <span className="font-semibold normal-case tracking-normal opacity-90">{seriesHeadline(standing)}</span>
}
