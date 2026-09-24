import type { ReactNode } from 'react'
import { FaTrophy } from 'react-icons/fa6'
import type { Tier } from '@/config'
import type { PlayerHistory } from '@/selectors'
import { LeagueBadge } from '../LeagueBadge'
import { TeamCell } from '../TeamCell'

// A player's FFU history, as the Players table's expanded row: title games, drafts, best weeks and
// who started him. Presentational — the page computes the history and owns which row is open.

function List({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <section className="min-w-0 space-y-1.5">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted">{title}</h3>
      {children.length > 0 ? (
        <ul className="divide-y divide-border border border-border bg-surface text-sm">{children}</ul>
      ) : (
        <p className="border border-dashed border-border p-2 text-sm text-muted">{empty}</p>
      )}
    </section>
  )
}

function Row({ year, tier, memberId, detail }: { year: string; tier: Tier; memberId: string; detail: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1.5">
      <span className="w-9 font-mono text-xs tabular-nums text-muted">{year}</span>
      <LeagueBadge tier={tier} />
      <TeamCell ffuId={memberId} year={year} />
      <span className="ml-auto whitespace-nowrap font-mono text-xs tabular-nums">{detail}</span>
    </li>
  )
}

const Result = ({ won }: { won: boolean }) =>
  won ? (
    <span className="inline-flex items-center gap-1 font-bold text-amber-500">
      <FaTrophy size={10} aria-hidden />
      Won
    </span>
  ) : (
    <span className="text-muted">Lost</span>
  )

export function PlayerDetailPanel({ history }: { history: PlayerHistory }) {
  const { titleGames, drafts, topWeeks, managers } = history
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <List title="Title Games" empty="Never started in an FFU final.">
        {titleGames.map((t) => (
          <Row key={`${t.year}-${t.tier}-${t.memberId}`} {...t} detail={<>{t.points.toFixed(2)} · <Result won={t.won} /></>} />
        ))}
      </List>
      <List title="Drafted" empty="Not drafted in an FFU draft since 2021.">
        {drafts.map((d) => (
          <Row key={`${d.year}-${d.tier}-${d.overall}`} {...d} detail={`Rd ${d.round} · #${d.overall}`} />
        ))}
      </List>
      <List title="Best Weeks" empty="Never started for an FFU team.">
        {topWeeks.map((w) => (
          <Row key={`${w.year}-${w.tier}-${w.week}-${w.memberId}`} {...w} detail={`Wk ${w.week}${w.isPlayoff ? ' (PO)' : ''} · ${w.points.toFixed(2)}`} />
        ))}
      </List>
      <List title="Who Started Him" empty="Nobody yet.">
        {managers.map((m) => (
          <li key={m.memberId} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1.5">
            <TeamCell ffuId={m.memberId} />
            <span className="text-xs text-muted">{m.years.join(', ')}</span>
            <span className="ml-auto whitespace-nowrap font-mono text-xs tabular-nums">
              {m.starts} st · {m.points.toFixed(2)}
            </span>
          </li>
        ))}
      </List>
    </div>
  )
}
