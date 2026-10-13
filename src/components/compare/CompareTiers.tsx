import type { Tier } from '@/config'
import { emptyCareer, pointsPerGame, type CareerStats, type CompareSide } from '@/selectors'
import { recordLabel } from '../format'
import { LEAGUE_STYLES, TIER_PRESTIGE } from '../leagues'
import { teamAbbr } from '../seriesText'
import { HardwareRow, StatRow } from './CompareRows'

// The comparison split by league: how each member has done in Premier, Masters and National
// separately, so a long National career doesn't hide behind a short Premier one (or the reverse).
// A league neither has played in is left out; one only one of them has played shows a dash.

const dash = '—'
/** Literal classes (Tailwind only builds what it can read), so two leagues split the row in half. */
const COLUMNS = ['', '', 'md:grid-cols-2', 'md:grid-cols-3'] as const

function TierCard({ tier, a, b, aId, bId }: { tier: Tier; a: CareerStats | undefined; b: CareerStats | undefined; aId: string; bId: string }) {
  const style = LEAGUE_STYLES[tier]
  const ca = a ?? emptyCareer(aId)
  const cb = b ?? emptyCareer(bId)
  const show = (c: CareerStats | undefined, f: (c: CareerStats) => string) => (c ? f(c) : dash)
  const winPct = (c: CareerStats) => `${(c.winPct * 100).toFixed(1)}%`
  const ppg = (c: CareerStats) => pointsPerGame(c)?.toFixed(2) ?? dash
  const both = a !== undefined && b !== undefined ? true : undefined
  return (
    <section className="border border-border bg-surface shadow-sm">
      <h3 className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${style.solidHeader}`}>{style.label}</h3>
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">{`${style.label} comparison`}</caption>
        {/* A fixed label column with the figures aligned to it: one league alone fills the row,
            and its figures must not drift to the card's edges. */}
        <colgroup>
          <col />
          <col className="w-24" />
          <col />
        </colgroup>
        <thead>
          <tr className="text-[11px] font-bold uppercase tracking-wider text-muted">
            <th scope="col" className="px-3 pt-2 text-right">{teamAbbr(aId)}</th>
            <td />
            <th scope="col" className="px-3 pt-2 text-left">{teamAbbr(bId)}</th>
          </tr>
        </thead>
        <tbody>
          <StatRow label="Seasons" a={ca.seasons} b={cb.seasons} values={[ca.seasons, cb.seasons]} better="none" />
          {/* Only a league both have played is a contest: against a dash, nobody is ahead. */}
          <StatRow label="Record" a={show(a, recordLabel)} b={show(b, recordLabel)} values={both && [ca.wins, cb.wins]} />
          <StatRow label="Win %" a={show(a, winPct)} b={show(b, winPct)} values={both && [ca.winPct, cb.winPct]} />
          <StatRow label="PPG" a={show(a, ppg)} b={show(b, ppg)} values={both && [pointsPerGame(ca) ?? 0, pointsPerGame(cb) ?? 0]} />
          <StatRow label="Playoffs" a={ca.playoffAppearances} b={cb.playoffAppearances} values={both && [ca.playoffAppearances, cb.playoffAppearances]} />
          <HardwareRow label="Titles" kind="title" a={ca} b={cb} better={both ? 'high' : 'none'} />
        </tbody>
      </table>
    </section>
  )
}

export function CompareTiers({ a, b }: { a: CompareSide; b: CompareSide }) {
  const tiers = TIER_PRESTIGE.filter((t) => a.byTier[t] || b.byTier[t])
  return (
    <div className={`grid gap-3 ${COLUMNS[tiers.length] ?? ''}`}>
      {tiers.map((tier) => (
        <TierCard key={tier} tier={tier} a={a.byTier[tier]} b={b.byTier[tier]} aId={a.memberId} bId={b.memberId} />
      ))}
    </div>
  )
}
