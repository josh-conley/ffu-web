import type { SeriesStanding } from '@/selectors'
import { seriesScore, teamAbbr } from './seriesText'

function seriesText(s: SeriesStanding): string {
  if (s.meetings === 0) return 'First meeting'
  return s.leaderId ? `${teamAbbr(s.leaderId)} leads all-time ${seriesScore(s)}` : `All-time series tied ${seriesScore(s)}`
}

/** One-line all-time series tag ("STA leads all-time 5–4") for a lineup modal's header. */
export function SeriesTag({ standing }: { standing: SeriesStanding }) {
  return <span className="font-semibold normal-case tracking-normal opacity-90">{seriesText(standing)}</span>
}
