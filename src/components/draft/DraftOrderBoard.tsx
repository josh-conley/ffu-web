import { useState } from 'react'
import type { LiveDraftOrder } from '@/data'
import { snakePickNumbers } from '@/selectors'
import { LEAGUE_STYLES, type LeagueStyle } from '../leagues'
import { draftDateTime } from '../format'
import { BoardFrame, RoundRailCorner } from './BoardFrame'
import { cellStateClass } from './format'
import { RoundLabel, TeamHeader } from './parts'

// The same board as a completed draft — team nameplates across the top, one row per round — but
// before a single pick exists. Every cell shows the coordinate that will be picked there, so a
// manager can read straight down their column and see exactly which picks they own in a snake.
// Reuses TeamHeader/RoundLabel/BoardFrame, so it is the real board, not a lookalike.

/** An unmade pick: its coordinate and overall number, waiting to be filled. */
function EmptyCell({ round, inRound, overall, ownerId, highlighted }: {
  round: number
  inRound: number
  overall: number
  ownerId: string | undefined
  highlighted: string | null
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden border border-dashed border-border bg-surface-2/40 ${cellStateClass(highlighted, ownerId ?? '')}`}
    >
      <div className="flex items-center justify-between gap-1 px-1.5 py-0.5 text-muted">
        <span className="font-mono text-[10px] font-bold tabular-nums">
          {round}.{String(inRound).padStart(2, '0')}
        </span>
        <span className="font-mono text-[9px] tabular-nums sm:text-[11px]">#{overall}</span>
      </div>
      <div className="px-2 py-1.5">
        <span className="block h-3 w-full bg-border/50" aria-hidden />
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

function BodyRows({ rounds, slots, picksBySlot, ownerBySlot, tier, highlighted }: {
  rounds: number[]
  slots: number[]
  picksBySlot: Map<number, number[]>
  ownerBySlot: Map<number, string | undefined>
  tier: LeagueStyle
  highlighted: string | null
}) {
  const teams = slots.length
  return (
    <>
      {rounds.map((round) => (
        <tr key={round}>
          <RoundLabel round={round} tier={tier} />
          {slots.map((slot) => (
            <td key={slot} className="p-0.5 align-top">
              <EmptyCell
                round={round}
                inRound={round % 2 === 1 ? slot : teams - slot + 1}
                overall={picksBySlot.get(slot)?.[round - 1] ?? 0}
                ownerId={ownerBySlot.get(slot)}
                highlighted={highlighted}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** When it starts, and whether anyone is still unmapped — context for the board below. */
function OrderStatus({ order }: { order: LiveDraftOrder }) {
  return (
    <p className="text-sm text-muted">
      {order.startTime === null ? (
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

export function DraftOrderBoard({ order, year }: { order: LiveDraftOrder; year: string }) {
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const toggle = (id: string) => setHighlighted((prev) => (prev === id ? null : id))

  const slots = order.slots.map((s) => s.slot)
  const ownerBySlot = new Map(order.slots.map((s) => [s.slot, s.ffuId]))
  const picksBySlot = new Map(order.slots.map((s) => [s.slot, snakePickNumbers(s.slot, order.rounds, slots.length)]))
  const rounds = Array.from({ length: order.rounds }, (_, i) => i + 1)

  if (slots.length === 0) {
    return (
      <div className="space-y-3">
        <OrderStatus order={order} />
        <p className="text-muted">The draft order hasn&apos;t been set yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <OrderStatus order={order} />
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
            tier={LEAGUE_STYLES[order.tier]}
            highlighted={highlighted}
          />
        }
      />
      <p className="text-xs text-muted">
        No picks have been made yet. Click a team to spotlight the picks it owns.
      </p>
    </div>
  )
}
