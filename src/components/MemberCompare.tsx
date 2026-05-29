import { getMember } from '@/config'
import type { CareerStats, H2HRecord } from '@/selectors'
import { TeamLogo } from './TeamLogo'
import { LeagueBadge } from './LeagueBadge'

const name = (ffuId: string) => getMember(ffuId)?.name ?? ffuId
const better = 'font-semibold text-emerald-600 dark:text-emerald-400'

function CompareRow({ label, a, b, dir, fmt }: { label: string; a: number; b: number; dir: 'high' | 'low' | 'none'; fmt?: (n: number) => string }) {
  const f = fmt ?? ((n: number) => String(n))
  const aWins = dir === 'high' ? a > b : dir === 'low' ? a < b : false
  const bWins = dir === 'high' ? b > a : dir === 'low' ? b < a : false
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className={`px-3 py-2 text-right tabular-nums ${aWins ? better : ''}`}>{f(a)}</td>
      <td className="px-3 py-2 text-center text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</td>
      <td className={`px-3 py-2 text-left tabular-nums ${bWins ? better : ''}`}>{f(b)}</td>
    </tr>
  )
}

function CareerCompare({ a, b }: { a: CareerStats; b: CareerStats }) {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  return (
    <table className="min-w-full text-sm">
      <tbody>
        <CompareRow label="Seasons" a={a.seasons} b={b.seasons} dir="none" />
        <CompareRow label="Win %" a={a.winPct} b={b.winPct} dir="high" fmt={pct} />
        <CompareRow label="Wins" a={a.wins} b={b.wins} dir="high" />
        <CompareRow label="Championships" a={a.championships} b={b.championships} dir="high" />
        <CompareRow label="Best Finish" a={a.bestFinish ?? 99} b={b.bestFinish ?? 99} dir="low" fmt={(n) => (n === 99 ? '—' : String(n))} />
        <CompareRow label="Playoff Apps" a={a.playoffAppearances} b={b.playoffAppearances} dir="high" />
        <CompareRow label="Points For" a={a.pointsFor} b={b.pointsFor} dir="high" fmt={(n) => n.toFixed(1)} />
      </tbody>
    </table>
  )
}

function H2H({ h2h }: { h2h: H2HRecord }) {
  if (h2h.meetings.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No head-to-head meetings yet.</p>
  }
  const ties = h2h.ties > 0 ? ` (${h2h.ties} tie${h2h.ties > 1 ? 's' : ''})` : ''
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-semibold">{name(h2h.memberId)}</span>{' '}
        <span className="tabular-nums">{h2h.wins}–{h2h.losses}</span>{' '}
        <span className="font-semibold">{name(h2h.opponentId)}</span>
        {ties} · {h2h.pointsFor.toFixed(1)}–{h2h.pointsAgainst.toFixed(1)} pts
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {h2h.meetings.map((m, i) => (
              <tr key={`${m.year}-${m.tier}-${m.week}-${i}`}>
                <td className="px-3 py-2 tabular-nums">{m.year}</td>
                <td className="px-3 py-2"><LeagueBadge tier={m.tier} /></td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{m.round ?? `Wk ${m.week}`}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${m.result === 'W' ? better : ''}`}>{m.score.toFixed(2)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${m.result === 'L' ? better : ''}`}>{m.opponentScore.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MemberCompare({ a, b, h2h }: { a: CareerStats; b: CareerStats; h2h: H2HRecord }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 items-center gap-4">
        <div className="flex items-center justify-end gap-2 text-right">
          <span className="font-semibold">{name(a.memberId)}</span>
          <TeamLogo ffuId={a.memberId} size={36} />
        </div>
        <div className="flex items-center gap-2">
          <TeamLogo ffuId={b.memberId} size={36} />
          <span className="font-semibold">{name(b.memberId)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800">
        <CareerCompare a={a} b={b} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Head-to-Head</h2>
        <H2H h2h={h2h} />
      </section>
    </div>
  )
}
