import type { SeasonData } from '@/data'
import { seasonSide, winPct, type SeasonSide } from '@/selectors'
import { formatPoints, ordinal, recordLabel } from '../../format'
import { BETTER_TEXT, leaderOf, type Better } from '../../compare/better'

// The pick'em modal's condensed compare: this season only, one figure per row, the better side in
// green (the Compare view's convention). Figures come from the same seasonSide the Compare view
// uses, so they can't disagree with it or with Standings.

interface Row {
  label: string
  show: (s: SeasonSide) => string | undefined
  value?: (s: SeasonSide) => number | undefined
  better?: Better
}

const games = (s: SeasonSide) => s.team.record.wins + s.team.record.losses + s.team.record.ties
const ppg = (s: SeasonSide) => (games(s) === 0 ? undefined : s.team.points.for / games(s))
const diff = (s: SeasonSide) => s.team.points.for - s.team.points.against

const ROWS: Row[] = [
  { label: 'Record', show: (s) => recordLabel(s.team.record), value: (s) => winPct(s.team.record) },
  { label: 'UPR', show: (s) => s.upr?.toFixed(2), value: (s) => s.upr },
  { label: 'PPG', show: (s) => ppg(s)?.toFixed(2), value: ppg },
  { label: 'Points For', show: (s) => formatPoints(s.team.points.for), value: (s) => s.team.points.for },
  { label: 'Point Diff', show: (s) => `${diff(s) > 0 ? '+' : ''}${formatPoints(diff(s))}`, value: diff },
  { label: 'High', show: (s) => s.highLow && formatPoints(s.highLow.high), value: (s) => s.highLow?.high },
  // No contest on the low game, as in the Compare view: a higher floor isn't plainly "better".
  { label: 'Low', show: (s) => s.highLow && formatPoints(s.highLow.low) },
]

function Line({ label, a, b, values, better = 'high' }: { label: string; a: string; b: string; values?: [number, number]; better?: Better }) {
  const lead = values ? leaderOf(values, better) : undefined
  return (
    <tr className="border-t border-border">
      <td className={`px-2 py-1.5 text-right font-mono tabular-nums ${lead === 'a' ? BETTER_TEXT : ''}`}>{a}</td>
      <th scope="row" className="px-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted sm:text-[11px]">{label}</th>
      <td className={`px-2 py-1.5 text-left font-mono tabular-nums ${lead === 'b' ? BETTER_TEXT : ''}`}>{b}</td>
    </tr>
  )
}

export function PickemSeasonSnapshot({ seasons, a, b }: { seasons: SeasonData[]; a: string; b: string }) {
  const [sa, sb] = [seasonSide(seasons, a), seasonSide(seasons, b)]
  const year = seasons[0]?.year
  const through = Math.max(0, ...seasons.flatMap((s) => s.games.filter((g) => !g.isPlayoff).map((g) => g.week)))
  if (!sa && !sb) return <p className="px-4 py-3 text-sm text-muted">No games on file this season yet.</p>
  // A standing is only comparable inside one league: 2nd in Premier isn't "behind" 1st in National.
  const sameLeague = sa !== undefined && sb !== undefined && sa.tier === sb.tier
  return (
    <section className="px-2 py-3 sm:px-4">
      <h3 className="mb-1 text-center text-[11px] font-bold uppercase tracking-widest text-muted">
        {year} season{through > 0 ? `, through week ${through}` : ''}
      </h3>
      <table className="w-full table-fixed border-collapse text-sm">
        <tbody>
          <Line label="Standing" a={sa ? ordinal(sa.rank) : '—'} b={sb ? ordinal(sb.rank) : '—'} values={sameLeague ? [sa.rank, sb.rank] : undefined} better="low" />
          {ROWS.map((r) => {
            const [va, vb] = [sa && r.value?.(sa), sb && r.value?.(sb)]
            return (
              <Line key={r.label} label={r.label} a={(sa && r.show(sa)) ?? '—'} b={(sb && r.show(sb)) ?? '—'}
                values={r.value && va !== undefined && vb !== undefined ? [va, vb] : undefined} better={r.better} />
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
