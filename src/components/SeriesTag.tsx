import { getMember } from '@/config'
import type { SeriesStanding } from '@/selectors'

const abbr = (ffuId: string) => getMember(ffuId)?.abbreviation ?? getMember(ffuId)?.name ?? ffuId

function seriesText(s: SeriesStanding): string {
  if (s.meetings === 0) return 'First meeting'
  const tail = s.ties > 0 ? `–${s.ties}` : ''
  const score = `${s.leaderWins}–${s.trailerWins}${tail}`
  return s.leaderId ? `${abbr(s.leaderId)} leads all-time ${score}` : `All-time series tied ${score}`
}

/** One-line all-time series tag ("STA leads all-time 5–4") for a lineup modal's header. */
export function SeriesTag({ standing }: { standing: SeriesStanding }) {
  return <span className="font-semibold normal-case tracking-normal opacity-90">{seriesText(standing)}</span>
}
