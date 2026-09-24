import type { ReactNode } from 'react'
import type { PlayerDraftRow, PlayerTitle, PlayerWeek } from '@/selectors'
import { LeagueBadge } from '../LeagueBadge'
import { TeamCell } from '../TeamCell'

function List({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted">{title}</h3>
      {children.length > 0 ? (
        <ul className="divide-y divide-border border border-border bg-surface text-sm shadow-sm">{children}</ul>
      ) : (
        <p className="border border-dashed border-border bg-surface/60 p-3 text-sm text-muted">{empty}</p>
      )}
    </section>
  )
}

function Row({ year, tier, memberId, detail }: { year: string; tier: PlayerTitle['tier']; memberId: string; detail: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <span className="w-10 font-mono tabular-nums text-muted">{year}</span>
      <LeagueBadge tier={tier} />
      <TeamCell ffuId={memberId} year={year} />
      <span className="ml-auto font-mono tabular-nums">{detail}</span>
    </li>
  )
}

/** Titles he started in, where he was drafted, and his best FFU weeks — side by side on wide screens. */
export function PlayerHighlights({ titles, drafts, topWeeks }: { titles: PlayerTitle[]; drafts: PlayerDraftRow[]; topWeeks: PlayerWeek[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <List title="Championships" empty="Never started in an FFU title game win.">
        {titles.map((t) => (
          <Row key={`${t.year}-${t.tier}`} {...t} detail={`${t.points.toFixed(2)} in the final`} />
        ))}
      </List>
      <List title="Drafted" empty="Never drafted in an FFU draft since 2021.">
        {drafts.map((d) => (
          <Row key={`${d.year}-${d.tier}-${d.overall}`} {...d} detail={`Rd ${d.round} · #${d.overall}`} />
        ))}
      </List>
      <List title="Best Weeks" empty="Never started for an FFU team.">
        {topWeeks.map((w) => (
          <Row key={`${w.year}-${w.tier}-${w.week}-${w.memberId}`} {...w} detail={`Wk ${w.week}${w.isPlayoff ? ' (playoffs)' : ''} · ${w.points.toFixed(2)}`} />
        ))}
      </List>
    </div>
  )
}
