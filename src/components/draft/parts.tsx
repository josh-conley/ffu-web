import { getMember, nameForYear } from '@/config'
import type { DraftData, DraftPick } from '@/data'
import { pickLabel } from '@/selectors'
import type { LeagueStyle } from '../leagues'
import { posClass, posSolid } from '../positions'
import { TeamLogo } from '../TeamLogo'
import { presentPositions } from './format'

/** A team's column header: logo hero + name + abbreviation. Click to spotlight that team's picks. */
export function TeamHeader({ slot, ownerId, year, highlighted, onToggle }: {
  slot: number
  ownerId: string | undefined
  year: string
  highlighted: string | null
  onToggle: (id: string) => void
}) {
  const dim = highlighted !== null && ownerId !== highlighted
  return (
    <th scope="col" className="border-b-2 border-border bg-surface-2 p-0">
      <button
        type="button"
        onClick={() => ownerId && onToggle(ownerId)}
        aria-pressed={ownerId !== undefined && highlighted === ownerId}
        className={`flex w-full flex-col items-center gap-1 px-1 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${dim ? 'opacity-40' : 'hover:bg-surface'}`}
      >
        {ownerId && <TeamLogo ffuId={ownerId} size={28} />}
        <span className="max-w-full truncate text-[11px] font-extrabold uppercase tracking-tight">
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

/** Sticky-left round rail cell: round number (tier-tinted) + the round's snake direction. */
export function RoundLabel({ round, tier }: { round: number; tier: LeagueStyle }) {
  return (
    <th scope="row" className="sticky left-0 z-10 border-b border-r border-border bg-surface-2 px-0.5 py-1 text-center align-middle sm:px-1">
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

/** A small colored position dot (Editorial variant). */
export function PosDot({ position }: { position: string }) {
  return <span aria-hidden className={`size-2 shrink-0 rounded-full ${posSolid(position)}`} />
}

/** Pick coordinate (snake notation) + overall number — the meta line shared by every cell. */
export function PickMeta({ pick, numTeams }: { pick: DraftPick; numTeams: number }) {
  return (
    <div className="flex items-center justify-between text-[10px] tabular-nums text-muted">
      <span className="font-mono font-bold">{pickLabel(pick, numTeams)}</span>
      <span>#{pick.overall}</span>
    </div>
  )
}
