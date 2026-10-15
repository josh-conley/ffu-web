import { useEffect, useRef } from 'react'
import { nameForYear } from '@/config'
import type { PickRound } from '@/lib/cupPickem'
import { SELECT } from '../../controls'

// The pick'em bracket's one piece the Cup's bracket doesn't have: the Round of 18's extra pick,
// which of the member's nine winners is culled as the lowest scorer. Styled as the real bracket's
// "Dropped" note, which sits in the same place (over the left quarterfinals).

/**
 * Brings the drop pick to the member the moment it's owed (their last Round of 18 winner just
 * picked): scrolls it to the middle of the screen, sideways too, since the bracket scrolls on a
 * phone, and focuses the dropdown. Only on that change, never on load (a remembered bracket that
 * already owes it isn't yanked into view), and without the smooth scroll under reduced motion.
 */
function useFocusWhenOwed(owed: boolean) {
  const ref = useRef<HTMLSelectElement>(null)
  const was = useRef(owed)
  useEffect(() => {
    if (owed && !was.current && ref.current) {
      const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ref.current.scrollIntoView?.({ behavior: smooth ? 'smooth' : 'auto', block: 'center', inline: 'center' })
      ref.current.focus({ preventScroll: true })
    }
    was.current = owed
  }, [owed])
  return ref
}

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
  return <DropSelect round={round} winners={winners} name={name} onDrop={onDrop} />
}

function DropSelect({ round, winners, name, onDrop }: {
  round: PickRound
  winners: string[]
  name: (id: string) => string
  onDrop: (roundKey: string, ffuId: string) => void
}) {
  const ready = winners.length === round.slots.length
  // Owed now: every game picked, the drop not made. Then it's the one thing blocking the bracket,
  // so it stands out in the Cup's blue (the pick colour) rather than reading as a footnote.
  const owed = ready && round.drop === undefined
  const select = useFocusWhenOwed(owed)
  const box = owed ? 'border-2 border-pick-edge bg-pick p-2 text-text' : 'border-l-2 border-national pl-2 text-muted'
  return (
    <label className={`mb-2 block space-y-1 text-[11px] leading-tight ${box}`}>
      <span className="flex items-center justify-between gap-2">
        <span className={owed ? 'text-xs font-bold' : ''}>{owed ? 'Pick the team to drop' : 'Dropped (lowest winner):'}</span>
        {owed && <span className="shrink-0 bg-pick-edge px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Required</span>}
      </span>
      {owed && <span className="block">Which of your {round.slots.length} {round.label} winners scores lowest? They&apos;re knocked out before the quarterfinals.</span>}
      <select ref={select} className={`${SELECT} w-full text-xs`} value={round.drop ?? ''} disabled={!ready} onChange={(e) => onDrop(round.key, e.target.value)}>
        {/* Short: the select sits in a narrow quarterfinal column, and the text above explains it. */}
        <option value="">{ready ? 'Choose one…' : 'Not yet'}</option>
        {winners.map((id) => <option key={id} value={id}>{name(id)}</option>)}
      </select>
    </label>
  )
}
