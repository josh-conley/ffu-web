import { CUP_PICKEM_POINTS, isCupRoundKey, nameForYear } from '@/config'
import type { Tier } from '@/config/types'
import type { PickRound, PickSlot } from '@/lib/cupPickem'
import type { PickOutcome } from '@/selectors'
import { LEAGUE_STYLES } from '../../leagues'
import { SELECT } from '../../controls'

// A pick'em bracket, round by round, top to bottom (a phone scrolls down it, never sideways).
// Editable while a member fills it in — tap the team you think wins — and read-only on the
// leaderboard, where each pick is marked by how it turned out.

export interface PickemBracketProps {
  bracket: PickRound[]
  year: string
  tierOf: ReadonlyMap<string, Tier>
  /** Omit for a read-only bracket. */
  onPick?: (roundKey: string, index: number, ffuId: string) => void
  onDrop?: (roundKey: string, ffuId: string) => void
  outcomes?: Record<string, (PickOutcome | undefined)[]>
}

const OUTCOME_STYLE: Record<PickOutcome, string> = {
  won: 'border-positive text-positive',
  lost: 'border-negative text-negative line-through',
  pending: 'border-accent',
}

function TeamChoice({ ffuId, year, tier, picked, outcome, onChoose }: {
  ffuId: string | undefined
  year: string
  tier: Tier | undefined
  picked: boolean
  outcome: PickOutcome | undefined
  onChoose?: () => void
}) {
  const name = ffuId === undefined ? 'TBD' : (nameForYear(ffuId, year) ?? ffuId)
  const tone = picked ? `border-l-4 font-semibold ${OUTCOME_STYLE[outcome ?? 'pending']}` : 'border-l-4 border-transparent text-muted'
  const body = (
    <span className="flex min-w-0 items-center gap-1.5">
      {tier && <span className={`h-2 w-2 shrink-0 rounded-full ${LEAGUE_STYLES[tier].dot}`} aria-hidden />}
      <span className="truncate">{name}</span>
    </span>
  )
  const base = `flex min-h-11 w-full items-center px-2 py-1 text-left text-sm md:min-h-9 ${tone}`
  if (onChoose === undefined || ffuId === undefined) return <div className={base}>{body}</div>
  return (
    <button type="button" aria-pressed={picked} onClick={onChoose} className={`${base} cursor-pointer hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
      {body}
    </button>
  )
}

function Slot({ slot, roundKey, index, outcome, ...p }: Omit<PickemBracketProps, 'bracket' | 'outcomes' | 'onDrop'> & {
  slot: PickSlot
  roundKey: string
  index: number
  outcome: PickOutcome | undefined
}) {
  const open = slot.a === undefined || slot.b === undefined
  const side = (id: string | undefined) => (
    <TeamChoice
      ffuId={id}
      year={p.year}
      tier={id ? p.tierOf.get(id) : undefined}
      picked={id !== undefined && slot.pick === id}
      outcome={outcome}
      onChoose={p.onPick && !open && id ? () => p.onPick?.(roundKey, index, id) : undefined}
    />
  )
  return (
    <li className="divide-y divide-border border border-border bg-surface">
      {side(slot.a)}
      {side(slot.b)}
    </li>
  )
}

function DropPick({ round, year, onDrop }: { round: PickRound; year: string; onDrop?: PickemBracketProps['onDrop'] }) {
  const winners = round.slots.flatMap((s) => (s.pick !== undefined ? [s.pick] : []))
  const ready = winners.length === round.slots.length
  const label = `Lowest-scoring ${round.label} winner (eliminated before the quarterfinals)`
  if (!onDrop) {
    return round.drop ? <p className="text-sm text-muted">Dropped: <span className="font-semibold text-text">{nameForYear(round.drop, year) ?? round.drop}</span></p> : null
  }
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-semibold">{label}</span>
      <select className={`${SELECT} block w-full max-w-sm`} value={round.drop ?? ''} disabled={!ready} onChange={(e) => onDrop(round.key, e.target.value)}>
        <option value="">{ready ? 'Pick one of your winners…' : `Pick all ${round.slots.length} winners first`}</option>
        {winners.map((id) => <option key={id} value={id}>{nameForYear(id, year) ?? id}</option>)}
      </select>
    </label>
  )
}

export function PickemBracket({ bracket, outcomes, onDrop, ...p }: PickemBracketProps) {
  return (
    <div className="space-y-6">
      {bracket.map((round) => (
        <section key={round.key} className="space-y-2">
          <h3 className="flex items-baseline justify-between gap-2 border-b border-border pb-1 text-sm font-bold uppercase tracking-widest">
            {round.label}
            <span className="text-xs font-normal normal-case tracking-normal text-muted">
              {isCupRoundKey(round.key) ? `${CUP_PICKEM_POINTS[round.key]} pt${CUP_PICKEM_POINTS[round.key] === 1 ? '' : 's'} each` : ''}
            </span>
          </h3>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {round.slots.map((slot, j) => (
              <Slot key={j} slot={slot} roundKey={round.key} index={j} outcome={outcomes?.[round.key]?.[j]} {...p} />
            ))}
          </ol>
          {round.needsDrop && <DropPick round={round} year={p.year} onDrop={onDrop} />}
        </section>
      ))}
    </div>
  )
}
