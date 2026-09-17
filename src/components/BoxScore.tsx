import { Fragment } from 'react'
import type { LineupPlayer, PlayerMap, TeamLineup } from '@/data'
import { getMember, nameForYear } from '@/config'
import { benchByPoints } from '@/selectors'
import { shortPlayerName } from './format'
import { posClass } from './positions'
import { TeamLogo } from './TeamLogo'

// The head-to-head lineup body shared by the regular matchup modal and the cross-tier tournament
// modal. Source-agnostic: it takes two resolved sides (each a team's score + lineup) plus the shared
// roster slots, and renders starters row-by-row with the bench below. The two teams may live in
// different tiers (tournament) or the same one (matchups) — this component doesn't care.

const SLOT_LABEL: Record<string, string> = { SUPER_FLEX: 'SFLX', REC_FLEX: 'RFLX', WRRB_FLEX: 'W/R' }
const fmt = (n: number) => n.toFixed(2)
// 5 columns: name | score | slot | score | name — scores hug the centered slot badge. The middle
// three are as narrow as their contents allow on a phone, because everything they don't take is
// name: two names share one row, so each gets less than half the screen (see NameParts).
const COLS =
  'grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem_2.5rem_minmax(0,1fr)] items-center gap-x-1 sm:grid-cols-[minmax(0,1fr)_3rem_3.25rem_3rem_minmax(0,1fr)] sm:gap-x-2'
const ROW_PAD = 'px-2 sm:px-3'

/**
 * The same name twice, one shown per breakpoint: shortened on a phone, full from `sm` up. Swapped in
 * CSS rather than by measuring the viewport, so it costs no JS and can't flicker on resize.
 */
function NameParts({ full, className = '' }: { full: string; className?: string }) {
  const short = shortPlayerName(full)
  if (short === full) return <span className={`truncate ${className}`}>{full}</span>
  return (
    <>
      <span className={`truncate sm:hidden ${className}`}>{short}</span>
      <span className={`hidden truncate sm:inline ${className}`}>{full}</span>
    </>
  )
}

export interface BoxScoreSide {
  memberId: string
  score: number
  lineup: TeamLineup
}

function PlayerName({ player, players, align, dim }: { player?: LineupPlayer; players: PlayerMap; align: 'left' | 'right'; dim?: boolean }) {
  const info = player ? players[player.playerId] : undefined
  const team = player?.team ? <span className="shrink-0 text-[10px] text-muted">{player.team}</span> : null
  return (
    <span className={`flex min-w-0 items-center gap-1 sm:gap-1.5 ${align === 'right' ? 'justify-end' : ''} ${dim ? 'text-muted' : ''}`}>
      {align === 'right' && team}
      <NameParts full={info?.name ?? player?.playerId ?? ''} />
      {align === 'left' && team}
    </span>
  )
}

function StarterRows({ slots, a, b, players, winner }: { slots: string[]; a: TeamLineup; b: TeamLineup; players: PlayerMap; winner: 'a' | 'b' | null }) {
  return (
    <div className={`${COLS} ${ROW_PAD} py-2 text-xs sm:text-sm`}>
      {slots.map((slot, i) => (
        <Fragment key={i}>
          <PlayerName player={a.starters[i]} players={players} align="left" dim={winner === 'b'} />
          <span className={`text-right font-mono tabular-nums ${winner === 'b' ? 'text-muted' : ''}`}>{fmt(a.starters[i]?.points ?? 0)}</span>
          <span className={`justify-self-center rounded px-1 text-[10px] font-bold ${posClass(slot)}`}>{SLOT_LABEL[slot] ?? slot}</span>
          <span className={`font-mono tabular-nums ${winner === 'a' ? 'text-muted' : ''}`}>{fmt(b.starters[i]?.points ?? 0)}</span>
          <PlayerName player={b.starters[i]} players={players} align="right" dim={winner === 'a'} />
        </Fragment>
      ))}
    </div>
  )
}

function BenchRow({ p, players, align }: { p: LineupPlayer; players: PlayerMap; align: 'left' | 'right' }) {
  const info = players[p.playerId]
  const pos = info?.position ?? '—'
  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span className={`shrink-0 rounded px-1 text-[9px] font-bold ${posClass(pos)}`}>{pos}</span>
      <span className={`flex min-w-0 flex-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <NameParts full={info?.name ?? p.playerId} />
      </span>
      <span className="shrink-0 font-mono tabular-nums">{fmt(p.points)}</span>
    </div>
  )
}

function BenchSection({ a, b, players }: { a: TeamLineup; b: TeamLineup; players: PlayerMap }) {
  return (
    <>
      <div className="border-t border-border bg-surface-2/40 px-3 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted">Bench</div>
      <div className={`grid grid-cols-2 gap-x-3 sm:gap-x-6 ${ROW_PAD} py-2 text-xs sm:text-sm text-muted`}>
        <div className="space-y-1">{benchByPoints(a).map((p, i) => <BenchRow key={i} p={p} players={players} align="left" />)}</div>
        <div className="space-y-1">{benchByPoints(b).map((p, i) => <BenchRow key={i} p={p} players={players} align="right" />)}</div>
      </div>
    </>
  )
}

/** A team's name, abbreviated on a phone (STA) and written out from `sm` up — the same breakpoint
 *  swap the player names make, for the same reason. */
function TeamName({ memberId, year }: { memberId: string; year: string }) {
  const full = nameForYear(memberId, year) ?? memberId
  const abbreviation = getMember(memberId)?.abbreviation
  if (!abbreviation) return <span className="truncate">{full}</span>
  return (
    <>
      <span className="truncate sm:hidden">{abbreviation}</span>
      <span className="hidden truncate sm:inline">{full}</span>
    </>
  )
}

function Heads({ a, b, year, winner }: { a: BoxScoreSide; b: BoxScoreSide; year: string; winner: 'a' | 'b' | null }) {
  return (
    <div className={`${COLS} ${ROW_PAD} border-b border-border py-2 text-xs font-semibold sm:text-sm`}>
      <span className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${winner === 'b' ? 'text-muted' : ''}`}><TeamLogo ffuId={a.memberId} size={22} /><TeamName memberId={a.memberId} year={year} /></span>
      <span className={`text-right font-mono tabular-nums ${winner === 'b' ? 'text-muted' : ''}`}>{fmt(a.score)}</span>
      <span className="text-center text-[10px] text-muted">VS</span>
      <span className={`font-mono tabular-nums ${winner === 'a' ? 'text-muted' : ''}`}>{fmt(b.score)}</span>
      <span className={`flex min-w-0 items-center justify-end gap-1.5 sm:gap-2 ${winner === 'a' ? 'text-muted' : ''}`}><TeamName memberId={b.memberId} year={year} /><TeamLogo ffuId={b.memberId} size={22} /></span>
    </div>
  )
}

/** Head-to-head lineups (+ bench): slot label centered + color-coded, scores flanking it, names on the
 *  outer edges. The dimmed side is the loser (by score); ties dim neither. */
export function BoxScore({ slots, players, year, sides }: { slots: string[]; players: PlayerMap; year: string; sides: [BoxScoreSide, BoxScoreSide] }) {
  const [a, b] = sides
  const winner: 'a' | 'b' | null = a.score === b.score ? null : a.score > b.score ? 'a' : 'b'
  return (
    <>
      <Heads a={a} b={b} year={year} winner={winner} />
      <StarterRows slots={slots} a={a.lineup} b={b.lineup} players={players} winner={winner} />
      <BenchSection a={a.lineup} b={b.lineup} players={players} />
    </>
  )
}
