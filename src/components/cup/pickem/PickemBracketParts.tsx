import { FaTrophy } from 'react-icons/fa6'
import { CUP_ACCENT, CUP_PICKEM_POINTS, isCupRoundKey, nameForYear } from '@/config'
import type { Tier } from '@/config/types'
import type { PickRound, PickSlot } from '@/lib/cupPickem'
import type { PickOutcome } from '@/selectors'
import { SELECT } from '../../controls'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'

// The pieces of the pick'em bracket: a round's column, one matchup card, the dropped-team pick, and
// the champion at the end. Laid out like the Cup's own bracket (TournamentBracket) so the two read
// as the same thing.

const OUTCOME_STYLE: Record<PickOutcome, string> = {
  won: 'border-positive text-positive',
  lost: 'border-negative text-negative line-through',
  pending: 'border-accent',
}

function SideRow({ ffuId, year, tier, picked, dim, outcome }: {
  ffuId: string | undefined
  year: string
  tier: Tier | undefined
  picked: boolean
  dim: boolean
  outcome: PickOutcome | undefined
}) {
  const tone = picked ? `font-semibold ${OUTCOME_STYLE[outcome ?? 'pending']}` : `border-transparent ${dim ? 'text-muted' : ''}`
  return (
    <span className={`flex min-w-0 items-center gap-1.5 border-l-4 py-0.5 pl-1.5 ${tone}`}>
      {tier && <span className={`h-2 w-2 shrink-0 rounded-full ${LEAGUE_STYLES[tier].dot}`} aria-hidden />}
      <span className="truncate text-sm">{ffuId === undefined ? <span className="italic text-muted">TBD</span> : (nameForYear(ffuId, year) ?? ffuId)}</span>
    </span>
  )
}

export function MatchupCard({ slot, year, tierOf, outcome, onOpen }: {
  slot: PickSlot
  year: string
  tierOf: ReadonlyMap<string, Tier>
  outcome: PickOutcome | undefined
  onOpen?: () => void
}) {
  const side = (id: string | undefined) => (
    <SideRow ffuId={id} year={year} tier={id ? tierOf.get(id) : undefined} picked={id !== undefined && slot.pick === id} dim={slot.pick !== undefined && slot.pick !== id} outcome={outcome} />
  )
  const known = slot.a !== undefined && slot.b !== undefined
  const label = known ? `${nameForYear(slot.a!, year) ?? slot.a} v ${nameForYear(slot.b!, year) ?? slot.b}` : undefined
  return (
    <button
      type="button"
      disabled={!known || !onOpen}
      onClick={onOpen}
      aria-label={label}
      className={`flex w-full flex-col gap-0.5 border bg-surface p-1.5 text-left shadow-sm transition-colors enabled:cursor-pointer enabled:hover:border-accent enabled:hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent border-border`}
    >
      {side(slot.a)}
      {side(slot.b)}
    </button>
  )
}

/** The Round of 18's extra pick: which of the member's nine winners is culled as the lowest scorer. */
export function DropPick({ round, year, onDrop }: { round: PickRound; year: string; onDrop?: (roundKey: string, ffuId: string) => void }) {
  const winners = round.slots.flatMap((s) => (s.pick !== undefined ? [s.pick] : []))
  const name = (id: string) => nameForYear(id, year) ?? id
  if (!onDrop) {
    return round.drop ? <p className="border-l-2 border-national pl-2 text-[11px] leading-tight text-muted">Dropped: <span className="font-semibold text-text">{name(round.drop)}</span></p> : null
  }
  const ready = winners.length === round.slots.length
  return (
    <label className="block space-y-1 border-l-2 border-national pl-2 text-[11px] leading-tight">
      <span className="font-semibold">Lowest-scoring winner (eliminated)</span>
      <select className={`${SELECT} w-full text-xs`} value={round.drop ?? ''} disabled={!ready} onChange={(e) => onDrop(round.key, e.target.value)}>
        <option value="">{ready ? 'Pick one of your winners…' : `Pick all ${round.slots.length} winners first`}</option>
        {winners.map((id) => <option key={id} value={id}>{name(id)}</option>)}
      </select>
    </label>
  )
}

export function ColumnHeader({ round }: { round: PickRound }) {
  const points = isCupRoundKey(round.key) ? CUP_PICKEM_POINTS[round.key] : undefined
  return (
    <header className="mb-3 flex items-baseline justify-between border-b-2 border-accent pb-1">
      <h3 className="text-xs font-bold uppercase tracking-wide">{round.label}</h3>
      {points !== undefined && <span className="text-[10px] font-semibold uppercase text-muted">{points} pt{points === 1 ? '' : 's'} each</span>}
    </header>
  )
}

export function ChampionColumn({ champion, year }: { champion: string | undefined; year: string }) {
  return (
    <section className="flex w-44 shrink-0 flex-col">
      <header className="mb-3 border-b-2 pb-1" style={{ borderColor: CUP_ACCENT }}>
        <h3 className="text-xs font-bold uppercase tracking-wide">Champion</h3>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 border border-border bg-surface-2 p-3 text-center">
        <FaTrophy size={22} aria-hidden style={{ color: CUP_ACCENT }} />
        {champion ? (
          <>
            <TeamLogo ffuId={champion} size={40} clickable={false} />
            <span className="text-sm font-extrabold uppercase tracking-tight">{nameForYear(champion, year) ?? champion}</span>
          </>
        ) : (
          <span className="text-xs italic text-muted">Pick the final</span>
        )}
      </div>
    </section>
  )
}
