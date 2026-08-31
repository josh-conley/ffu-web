import { useState } from 'react'
import type { DraftPick, LiveDraftOrder } from '@/data'
import { snakePickNumbers } from '@/selectors'
import { LEAGUE_STYLES, type LeagueStyle } from '../leagues'
import { draftDateTime } from '../format'
import { BoardFrame, RoundRailCorner } from './BoardFrame'
import { cellStateClass } from './format'
import { PickCell } from './PickCell'
import { RoundLabel, TeamHeader } from './parts'

// The live season's board, from before the draft through to its last pick. Empty cells show the
// coordinate that will be picked there — so a manager can read down their column and see exactly
// which picks they own in a snake — and each one is replaced by the real nameplate as the pick
// lands. Reuses TeamHeader/RoundLabel/BoardFrame/PickCell, so it is the same board a completed
// season renders, not a lookalike.

/** An unmade pick: its coordinate and overall number, waiting to be filled. */
function EmptyCell({ round, inRound, overall, ownerId, highlighted, onClock }: {
  round: number
  inRound: number
  overall: number
  ownerId: string | undefined
  highlighted: string | null
  /** The next pick due — the only cell anyone is looking at once the draft is under way. */
  onClock: boolean
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden border bg-surface-2/40 ${onClock ? 'animate-pulse border-solid border-accent' : 'border-dashed border-border'} ${cellStateClass(highlighted, ownerId ?? '')}`}
    >
      <div className="flex items-center justify-between gap-1 px-1.5 py-0.5 text-muted">
        <span className="font-mono text-[10px] font-bold tabular-nums">
          {round}.{String(inRound).padStart(2, '0')}
        </span>
        <span className="font-mono text-[9px] tabular-nums sm:text-[11px]">#{overall}</span>
      </div>
      <div className="px-2 py-1.5">
        {onClock ? (
          <span className="block truncate text-[10px] font-extrabold uppercase tracking-wide text-accent">On the clock</span>
        ) : (
          <span className="block h-3 w-full bg-border/50" aria-hidden />
        )}
      </div>
    </div>
  )
}

function HeaderRow({ slots, ownerBySlot, year, highlighted, onToggle }: {
  slots: number[]
  ownerBySlot: Map<number, string | undefined>
  year: string
  highlighted: string | null
  onToggle: (id: string) => void
}) {
  return (
    <tr>
      <RoundRailCorner />
      {slots.map((slot) => (
        <TeamHeader key={slot} slot={slot} ownerId={ownerBySlot.get(slot)} year={year} highlighted={highlighted} onToggle={onToggle} />
      ))}
    </tr>
  )
}

function BodyRows({ rounds, slots, picksBySlot, ownerBySlot, made, nextOverall, tier, highlighted, onToggle }: {
  rounds: number[]
  slots: number[]
  picksBySlot: Map<number, number[]>
  ownerBySlot: Map<number, string | undefined>
  /** Picks already made, by overall number. */
  made: Map<number, DraftPick>
  nextOverall: number
  tier: LeagueStyle
  highlighted: string | null
  onToggle: (id: string) => void
}) {
  const teams = slots.length
  return (
    <>
      {rounds.map((round) => (
        <tr key={round}>
          <RoundLabel round={round} tier={tier} />
          {slots.map((slot) => {
            const overall = picksBySlot.get(slot)?.[round - 1] ?? 0
            const pick = made.get(overall)
            return (
              <td key={slot} className="p-0.5 align-top">
                {pick ? (
                  <PickCell pick={pick} ownerId={ownerBySlot.get(slot)} numTeams={teams} highlighted={highlighted} onToggle={onToggle} />
                ) : (
                  <EmptyCell
                    round={round}
                    inRound={round % 2 === 1 ? slot : teams - slot + 1}
                    overall={overall}
                    ownerId={ownerBySlot.get(slot)}
                    highlighted={highlighted}
                    onClock={overall === nextOverall}
                  />
                )}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

/** When it starts (or how far along it is) — context for the board below. */
function OrderStatus({ order, made, total, underway }: { order: LiveDraftOrder; made: number; total: number; underway: boolean }) {
  if (underway && made < total) {
    return (
      <p className="text-sm text-muted">
        <span className="font-semibold text-accent">Drafting now</span>
        <span> · pick {made + 1} of {total}</span>
      </p>
    )
  }
  return (
    <p className="text-sm text-muted">
      {made >= total && total > 0 ? (
        <span className="font-semibold text-text">Draft complete</span>
      ) : order.startTime === null ? (
        <span className="font-semibold uppercase tracking-wide">Date TBD</span>
      ) : (
        <time dateTime={new Date(order.startTime).toISOString()} className="font-semibold text-text">
          {draftDateTime(order.startTime)}
        </time>
      )}
      <span> · {order.rounds} rounds · snake</span>
      {order.unregistered > 0 && (
        <span>
          {' '}
          · {order.unregistered} manager{order.unregistered === 1 ? '' : 's'} not listed yet
        </span>
      )}
    </p>
  )
}

export function LiveDraftBoard({ order, picks, year }: { order: LiveDraftOrder; picks: DraftPick[]; year: string }) {
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const toggle = (id: string) => setHighlighted((prev) => (prev === id ? null : id))

  const slots = order.slots.map((s) => s.slot)
  const ownerBySlot = new Map(order.slots.map((s) => [s.slot, s.ffuId]))
  const picksBySlot = new Map(order.slots.map((s) => [s.slot, snakePickNumbers(s.slot, order.rounds, slots.length)]))
  const rounds = Array.from({ length: order.rounds }, (_, i) => i + 1)

  const made = new Map(picks.map((p) => [p.overall, p]))
  const total = slots.length * order.rounds
  // Nothing is "on the clock" until the draft actually starts: before then the board is a preview
  // of who picks where, and pulsing 1.01 for the days beforehand would read as a draft in progress.
  // Sleeper's status is what the commissioner's start button flips (it is re-read on a timer, so a
  // tab opened early still catches it); a pick already made says the same thing more plainly.
  const underway = order.status === 'drafting' || made.size > 0
  // The next unmade pick — pick_no is contiguous, so this is simply one past the last one made.
  const nextOverall = underway && made.size < total ? made.size + 1 : 0

  if (slots.length === 0) {
    return (
      <div className="space-y-3">
        <OrderStatus order={order} made={made.size} total={total} underway={underway} />
        <p className="text-muted">The draft order hasn&apos;t been set yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <OrderStatus order={order} made={made.size} total={total} underway={underway} />
      <BoardFrame
        tier={LEAGUE_STYLES[order.tier]}
        slots={slots}
        head={<HeaderRow slots={slots} ownerBySlot={ownerBySlot} year={year} highlighted={highlighted} onToggle={toggle} />}
        body={
          <BodyRows
            rounds={rounds}
            slots={slots}
            picksBySlot={picksBySlot}
            ownerBySlot={ownerBySlot}
            made={made}
            nextOverall={nextOverall}
            tier={LEAGUE_STYLES[order.tier]}
            highlighted={highlighted}
            onToggle={toggle}
          />
        }
      />
      <p className="text-xs text-muted">
        {made.size === 0
          ? 'No picks have been made yet. Click a team to spotlight the picks it owns.'
          : 'Click a team to spotlight its picks. The board refreshes itself while the draft is running.'}
      </p>
    </div>
  )
}
