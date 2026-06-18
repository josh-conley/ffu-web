import { getMember, nameForYear } from '@/config'
import type { DraftData } from '@/data'
import type { LeagueStyle } from '../leagues'
import { posClass } from '../positions'
import { TeamLogo } from '../TeamLogo'
import { presentPositions } from './format'

/** A team's column nameplate: logo + name + abbreviation. The tier-color rule under the header row
 *  reads as the league's identity; click to spotlight that team's picks. */
export function TeamHeader({ slot, ownerId, year, tier, highlighted, onToggle }: {
  slot: number
  ownerId: string | undefined
  year: string
  tier: LeagueStyle
  highlighted: string | null
  onToggle: (id: string) => void
}) {
  const dim = highlighted !== null && ownerId !== highlighted
  return (
    <th scope="col" className={`border-b-2 bg-surface-2 p-0 ${tier.border}`}>
      <button
        type="button"
        onClick={() => ownerId && onToggle(ownerId)}
        aria-pressed={ownerId !== undefined && highlighted === ownerId}
        className={`flex w-full flex-col items-center gap-1 px-1 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${dim ? 'opacity-40' : 'hover:bg-surface'}`}
      >
        {ownerId && <TeamLogo ffuId={ownerId} size={26} />}
        <span className="max-w-full truncate text-[11px] font-extrabold uppercase leading-none tracking-tight">
          {ownerId ? (nameForYear(ownerId, year) ?? ownerId) : slot}
        </span>
        {ownerId && (
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted">
            {getMember(ownerId)?.abbreviation}
          </span>
        )}
      </button>
    </th>
  )
}

/** Round rail (pinned left on horizontal scroll): round number (tier-tinted) + snake direction. */
export function RoundLabel({ round, tier }: { round: number; tier: LeagueStyle }) {
  return (
    <th scope="row" className="sticky left-0 z-20 border-b border-r border-border bg-surface-2 px-0.5 py-1 text-center align-middle sm:px-1">
      <div className={`font-mono text-xs font-black tabular-nums ${tier.text}`}>{round}</div>
      <div aria-hidden className="text-[9px] leading-none text-muted">{round % 2 === 1 ? '→' : '←'}</div>
    </th>
  )
}

/** Broadcast "lower-third": the position color key, so the grid's colors are decodable at a glance. */
export function PositionLegend({ draft }: { draft: DraftData }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {presentPositions(draft).map((p) => (
        <span key={p} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${posClass(p)}`}>{p}</span>
      ))}
    </div>
  )
}

/** Top-right "dog-ear" that flags a traded pick (the broadcast storyline cue). */
export function TradeFold() {
  return (
    <span
      aria-hidden
      className="absolute right-0 top-0 size-0 border-l-[14px] border-t-[14px] border-l-transparent border-t-accent"
    />
  )
}
