import { nameForYear } from '@/config'
import type { PickRound } from '@/lib/cupPickem'
import { SELECT } from '../../controls'

// The pick'em bracket's one piece the Cup's bracket doesn't have: the Round of 18's extra pick,
// which of the member's nine winners is culled as the lowest scorer. Styled as the real bracket's
// "Dropped" note, which sits in the same place.

export function DropPick({ round, year, onDrop }: { round: PickRound; year: string; onDrop?: (roundKey: string, ffuId: string) => void }) {
  const winners = round.slots.flatMap((s) => (s.pick !== undefined ? [s.pick] : []))
  const name = (id: string) => nameForYear(id, year) ?? id
  if (!onDrop) {
    if (!round.drop) return null
    return (
      <p className="mb-2 border-l-2 border-national pl-2 text-[11px] leading-tight text-muted">
        Dropped (lowest winner): <span className="font-semibold">{name(round.drop)}</span>
      </p>
    )
  }
  const ready = winners.length === round.slots.length
  return (
    <label className="mb-2 block space-y-1 border-l-2 border-national pl-2 text-[11px] leading-tight text-muted">
      <span>Dropped (lowest winner):</span>
      <select className={`${SELECT} w-full text-xs`} value={round.drop ?? ''} disabled={!ready} onChange={(e) => onDrop(round.key, e.target.value)}>
        <option value="">{ready ? 'Pick one of your winners…' : `Pick all ${round.slots.length} winners first`}</option>
        {winners.map((id) => <option key={id} value={id}>{name(id)}</option>)}
      </select>
    </label>
  )
}
