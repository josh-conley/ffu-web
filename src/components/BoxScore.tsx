import { Fragment } from 'react'
import type { LineupPlayer, PlayerMap, TeamLineup } from '@/data'
import { nameForYear } from '@/config'
import { benchByPoints } from '@/selectors'
import { posClass } from './positions'
import { TeamLogo } from './TeamLogo'

// The head-to-head lineup body shared by the regular matchup modal and the cross-tier tournament
// modal. Source-agnostic: it takes two resolved sides (each a team's score + lineup) plus the shared
// roster slots, and renders starters row-by-row with the bench below. The two teams may live in
// different tiers (tournament) or the same one (matchups) — this component doesn't care.

const SLOT_LABEL: Record<string, string> = { SUPER_FLEX: 'SFLX', REC_FLEX: 'RFLX', WRRB_FLEX: 'W/R' }
const fmt = (n: number) => n.toFixed(2)
// 5 columns: name | score | slot | score | name — scores hug the centered slot badge.
const COLS = 'grid grid-cols-[minmax(0,1fr)_3rem_3.25rem_3rem_minmax(0,1fr)] items-center gap-x-2'

export interface BoxScoreSide {
  memberId: string
  score: number
  lineup: TeamLineup
}

function PlayerName({ player, players, align, dim }: { player?: LineupPlayer; players: PlayerMap; align: 'left' | 'right'; dim?: boolean }) {
  const info = player ? players[player.playerId] : undefined
  const team = player?.team ? <span className="shrink-0 text-[10px] text-muted">{player.team}</span> : null
  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''} ${dim ? 'text-muted' : ''}`}>
      {align === 'right' && team}
      <span className="truncate">{info?.name ?? player?.playerId ?? ''}</span>
      {align === 'left' && team}
    </span>
  )
}

function StarterRows({ slots, a, b, players, winner }: { slots: string[]; a: TeamLineup; b: TeamLineup; players: PlayerMap; winner: 'a' | 'b' | null }) {
  return (
    <div className={`${COLS} px-3 py-2 text-sm`}>
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
    <div className={`flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span className={`shrink-0 rounded px-1 text-[9px] font-bold ${posClass(pos)}`}>{pos}</span>
      <span className={`min-w-0 flex-1 truncate ${align === 'right' ? 'text-right' : ''}`}>{info?.name ?? p.playerId}</span>
      <span className="shrink-0 font-mono tabular-nums">{fmt(p.points)}</span>
    </div>
  )
}

function BenchSection({ a, b, players }: { a: TeamLineup; b: TeamLineup; players: PlayerMap }) {
  return (
    <>
      <div className="border-t border-border bg-surface-2/40 px-3 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted">Bench</div>
      <div className="grid grid-cols-2 gap-x-6 px-3 py-2 text-sm text-muted">
        <div className="space-y-1">{benchByPoints(a).map((p, i) => <BenchRow key={i} p={p} players={players} align="left" />)}</div>
        <div className="space-y-1">{benchByPoints(b).map((p, i) => <BenchRow key={i} p={p} players={players} align="right" />)}</div>
      </div>
    </>
  )
}

function Heads({ a, b, year, winner }: { a: BoxScoreSide; b: BoxScoreSide; year: string; winner: 'a' | 'b' | null }) {
  const name = (id: string) => nameForYear(id, year) ?? id
  return (
    <div className={`${COLS} border-b border-border px-3 py-2 text-sm font-semibold`}>
      <span className={`flex min-w-0 items-center gap-2 ${winner === 'b' ? 'text-muted' : ''}`}><TeamLogo ffuId={a.memberId} size={22} /><span className="truncate">{name(a.memberId)}</span></span>
      <span className={`text-right font-mono tabular-nums ${winner === 'b' ? 'text-muted' : ''}`}>{fmt(a.score)}</span>
      <span className="text-center text-[10px] text-muted">VS</span>
      <span className={`font-mono tabular-nums ${winner === 'a' ? 'text-muted' : ''}`}>{fmt(b.score)}</span>
      <span className={`flex min-w-0 items-center justify-end gap-2 ${winner === 'a' ? 'text-muted' : ''}`}><span className="truncate">{name(b.memberId)}</span><TeamLogo ffuId={b.memberId} size={22} /></span>
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
