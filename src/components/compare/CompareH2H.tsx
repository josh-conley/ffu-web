import { getMember } from '@/config'
import { meetingOrder, type H2HMeeting, type H2HRecord, type SeriesBreakdown, type WinLoss } from '@/selectors'
import { formatPoints } from '../format'
import { LeagueBadge } from '../LeagueBadge'
import { teamAbbr } from '../seriesText'
import { BETTER_TEXT } from './CompareRows'

// The pair's own games: the series broken down as tiles, then every meeting, newest first. All
// from member `a`'s side, the side on the left everywhere else in the view.

const name = (ffuId: string) => getMember(ffuId)?.name ?? ffuId
const wl = ({ wins, losses, ties }: WinLoss) => `${wins}–${losses}${ties > 0 ? `–${ties}` : ''}`
const when = (m: H2HMeeting) => (m.isPlayoff ? `${m.year} ${m.round ?? 'Playoffs'}` : `${m.year} · Wk ${m.week}`)

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-surface px-3 py-2.5">
      <dt className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</dt>
      <dd className="font-mono text-base font-bold tabular-nums">{value}</dd>
      {note && <dd className="text-[11px] text-muted">{note}</dd>}
    </div>
  )
}

/** A side's widest win, from its own point of view: "+42.10", "2023 · Wk 3". */
function biggest(m: H2HMeeting | undefined): { value: string; note: string } {
  if (!m) return { value: '—', note: 'No wins yet' }
  return { value: `+${formatPoints(Math.abs(m.score - m.opponentScore))}`, note: when(m) }
}

const played = (r: WinLoss) => r.wins + r.losses + r.ties > 0

function SeriesTiles({ h2h, series }: { h2h: H2HRecord; series: SeriesBreakdown }) {
  const [aAbbr, bAbbr] = [teamAbbr(h2h.memberId), teamAbbr(h2h.opponentId)]
  const pair = `${aAbbr}–${bAbbr}`
  const { averages, streak, last, biggestWins } = series
  const lastResult = last && (last.result === 'T' ? 'Tied' : `${last.result === 'W' ? aAbbr : bAbbr} won`)
  return (
    <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
      <Tile label="All-time" value={wl(h2h)} note={pair} />
      <Tile label="Regular season" value={played(series.regular) ? wl(series.regular) : '—'} note={pair} />
      <Tile label="Playoffs" value={played(series.playoffs) ? wl(series.playoffs) : '—'} note={pair} />
      <Tile label="Avg score" value={averages ? `${averages[0].toFixed(1)}–${averages[1].toFixed(1)}` : '—'} note={pair} />
      <Tile label="Streak" value={streak ? `${teamAbbr(streak.memberId)} W${streak.length}` : '—'} note={streak ? undefined : 'Last game tied'} />
      <Tile label="Last met" value={lastResult ?? '—'} note={last && when(last)} />
      <Tile label={`Biggest win · ${aAbbr}`} {...biggest(biggestWins[0])} />
      <Tile label={`Biggest win · ${bAbbr}`} {...biggest(biggestWins[1])} />
    </dl>
  )
}

function Meetings({ h2h }: { h2h: H2HRecord }) {
  const newestFirst = [...h2h.meetings].sort((x, y) => meetingOrder(y) - meetingOrder(x))
  const TH = 'px-3 py-2 font-bold'
  return (
    <div className="overflow-x-auto border border-border bg-surface shadow-sm">
      <table className="w-max min-w-full text-sm">
        <caption className="sr-only">Every meeting</caption>
        <thead className="bg-surface-2">
          <tr className="text-xs uppercase tracking-wider text-muted">
            <th scope="col" className={`${TH} text-left`}>When</th>
            <th scope="col" className={`${TH} text-left`}>League</th>
            <th scope="col" className={`${TH} text-right`}>{name(h2h.memberId)}</th>
            <th scope="col" className={`${TH} text-right`}>{name(h2h.opponentId)}</th>
            <th scope="col" className={`${TH} text-right`}>Margin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {newestFirst.map((m) => (
            <tr key={`${m.year}-${m.tier}-${m.week}`} className="hover:bg-surface-2">
              <td className="px-3 py-2 tabular-nums">
                {when(m)}
                {m.isPlayoff && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-notable">Playoff</span>}
              </td>
              <td className="px-3 py-2"><LeagueBadge tier={m.tier} /></td>
              <td className={`px-3 py-2 text-right tabular-nums ${m.result === 'W' ? BETTER_TEXT : ''}`}>{formatPoints(m.score)}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${m.result === 'L' ? BETTER_TEXT : ''}`}>{formatPoints(m.opponentScore)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted">{formatPoints(Math.abs(m.score - m.opponentScore))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CompareH2H({ h2h, series }: { h2h: H2HRecord; series: SeriesBreakdown }) {
  if (h2h.meetings.length === 0) {
    return <p className="border border-dashed border-border bg-surface/60 p-4 text-sm text-muted">They have never met.</p>
  }
  return (
    <div className="space-y-3">
      <SeriesTiles h2h={h2h} series={series} />
      <Meetings h2h={h2h} />
    </div>
  )
}
