import { Fragment } from 'react'
import type { LineupPlayer, PlayerMap, TeamLineup } from '@/data'
import { getMember, nameForYear } from '@/config'
import { benchByPoints, type PlayerLiveStatus } from '@/selectors'
import { LiveStatusDot } from './LiveStatusDot'
import { nameTone, pointsText, pointsTone } from './liveStatusTone'
import { shortPlayerName, type GameNote } from './format'
import { posClass } from './positions'
import { TeamLogo } from './TeamLogo'

// The head-to-head lineup body shared by the regular matchup modal and the cross-tier tournament
// modal. Source-agnostic: it takes two resolved sides (each a team's score + lineup) plus the shared
// roster slots, and renders starters row-by-row with the bench below. The two teams may live in
// different tiers (tournament) or the same one (matchups) — this component doesn't care.
// A live box score adds two optional extras: each player's game status (a dot by the name) and
// each side's projected final score (a row under the heads).

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
  /** Projected final score, live games only; absent once there is nothing left to project. */
  projected?: number
}

/** Live box scores only: where a player's NFL game stands, and the note shown under their name. */
export interface PlayerLiveInfo {
  status: PlayerLiveStatus
  note: GameNote | undefined
}
type LiveOf = (playerId: string) => PlayerLiveInfo

const playerLabel = (player: LineupPlayer | undefined, players: PlayerMap) => (player ? players[player.playerId]?.name ?? player.playerId : '')

/** A starting slot the manager left empty (`null` in the lineup) — named as such, like Sleeper does. */
function EmptySlot({ align }: { align: 'left' | 'right' }) {
  return <span className={`truncate italic text-muted ${align === 'right' ? 'text-right' : ''}`}>Empty</span>
}

/** Mirrors a left-to-right run of parts for the right-hand team, so both read from the outer edge in. */
const mirrored = <T,>(parts: T[], align: 'left' | 'right') => (align === 'right' ? [...parts].reverse() : parts)

const TAG = 'shrink-0 whitespace-nowrap text-[10px] text-muted'

/**
 * The player's name with their NFL team beside it, and — live, while their game is still to come or
 * on — a note on it justified to the opposite end, beside the points: "@MIA · Sun 1:00 PM" from `sm`
 * up; on a phone just "Sun 1p" / "Q3 7:30", which also drops the team tag for room. Names line up
 * on the outer edge and notes on the inner one, so both read straight down; the name gives way.
 */
function NameBlock({ player, players, align, note }: { player?: LineupPlayer; players: PlayerMap; align: 'left' | 'right'; note?: GameNote | undefined }) {
  const name = [
    <NameParts key="name" full={playerLabel(player, players)} />,
    player?.team && <span key="team" className={`${TAG} ${note ? 'hidden sm:inline' : ''}`}>{player.team}</span>,
  ]
  const parts = [
    <span key="name" className="flex min-w-0 items-center gap-1 sm:gap-1.5">{mirrored(name, align)}</span>,
    note && <span key="note-full" className={`${TAG} hidden sm:inline`}>{note.full}</span>,
    note && <span key="note-short" className={`${TAG} sm:hidden`}>{note.short}</span>,
  ]
  return <span className={`flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3 ${note ? 'justify-between' : align === 'right' ? 'justify-end' : ''}`}>{mirrored(parts, align)}</span>
}

function PlayerName({ player, players, align, liveOf }: { player?: LineupPlayer | null; players: PlayerMap; align: 'left' | 'right'; liveOf?: LiveOf }) {
  if (player === null) return <EmptySlot align={align} />
  const live = player && liveOf?.(player.playerId)
  const parts = [
    <LiveStatusDot key="dot" status={live?.status} />,
    <NameBlock key="name" player={player} players={players} align={align} note={live?.note} />,
  ]
  return (
    <span className={`flex min-w-0 items-center gap-1 sm:gap-1.5 ${align === 'right' ? 'justify-end' : ''} ${nameTone(live?.status)}`}>
      {mirrored(parts, align)}
    </span>
  )
}

function PlayerPoints({ player, align, liveOf }: { player?: LineupPlayer | null; align: 'left' | 'right'; liveOf?: LiveOf }) {
  const status = player ? liveOf?.(player.playerId).status : undefined
  // An empty slot scores a real zero; muted like the rest of its row.
  const tone = player === null ? 'text-muted' : pointsTone(status)
  return <span className={`font-mono tabular-nums ${align === 'left' ? 'text-right' : ''} ${tone}`}>{pointsText(player?.points ?? 0, status)}</span>
}

/** Starters row by row. Every player reads at full strength whichever side is winning — the heads
 *  carry the result; what a player's own styling says is where their game stands (live only). */
function StarterRows({ slots, a, b, players, liveOf }: { slots: string[]; a: TeamLineup; b: TeamLineup; players: PlayerMap; liveOf?: LiveOf }) {
  return (
    <div className={`${COLS} ${ROW_PAD} py-2 text-xs sm:text-sm`}>
      {slots.map((slot, i) => (
        <Fragment key={i}>
          <PlayerName player={a.starters[i]} players={players} align="left" liveOf={liveOf} />
          <PlayerPoints player={a.starters[i]} align="left" liveOf={liveOf} />
          <span className={`justify-self-center rounded px-1 text-[10px] font-bold ${posClass(slot)}`}>{SLOT_LABEL[slot] ?? slot}</span>
          <PlayerPoints player={b.starters[i]} align="right" liveOf={liveOf} />
          <PlayerName player={b.starters[i]} players={players} align="right" liveOf={liveOf} />
        </Fragment>
      ))}
    </div>
  )
}

function BenchRow({ p, players, align, liveOf }: { p: LineupPlayer; players: PlayerMap; align: 'left' | 'right'; liveOf?: LiveOf }) {
  const pos = players[p.playerId]?.position ?? '—'
  const live = liveOf?.(p.playerId)
  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <LiveStatusDot status={live?.status} />
      <span className={`shrink-0 rounded px-1 text-[9px] font-bold ${posClass(pos)}`}>{pos}</span>
      <span className={`flex min-w-0 flex-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <NameBlock player={p} players={players} align={align} note={live?.note} />
      </span>
      <span className={`shrink-0 font-mono tabular-nums ${pointsTone(live?.status)}`}>{pointsText(p.points, live?.status)}</span>
    </div>
  )
}

/** A labelled strip of both teams' non-starters, side by side (the bench, and injured reserve). */
function NonStarters({ title, a, b, players, liveOf }: { title: string; a: LineupPlayer[]; b: LineupPlayer[]; players: PlayerMap; liveOf?: LiveOf | undefined }) {
  return (
    <>
      <div className="border-t border-border bg-surface-2/40 px-3 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted">{title}</div>
      <div className={`grid grid-cols-2 gap-x-3 sm:gap-x-6 ${ROW_PAD} py-2 text-xs sm:text-sm text-muted`}>
        <div className="space-y-1">{a.map((p, i) => <BenchRow key={i} p={p} players={players} align="left" liveOf={liveOf} />)}</div>
        <div className="space-y-1">{b.map((p, i) => <BenchRow key={i} p={p} players={players} align="right" liveOf={liveOf} />)}</div>
      </div>
    </>
  )
}

/** The bench (best first), then injured reserve beneath it — only when either team has anyone there
 *  (live lineups only; see TeamLineup.reserve). */
function BenchSection({ a, b, players, liveOf }: { a: TeamLineup; b: TeamLineup; players: PlayerMap; liveOf?: LiveOf }) {
  const irA = a.reserve ?? []
  const irB = b.reserve ?? []
  return (
    <>
      <NonStarters title="Bench" a={benchByPoints(a)} b={benchByPoints(b)} players={players} liveOf={liveOf} />
      {(irA.length > 0 || irB.length > 0) && <NonStarters title="Injured Reserve" a={irA} b={irB} players={players} liveOf={liveOf} />}
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
      <span className="flex min-w-0 items-center gap-1.5 sm:gap-2"><TeamLogo ffuId={a.memberId} size={22} /><TeamName memberId={a.memberId} year={year} /></span>
      <span className={`text-right font-mono tabular-nums ${winner === 'b' ? 'text-muted' : ''}`}>{fmt(a.score)}</span>
      <span className="text-center text-[10px] text-muted">VS</span>
      <span className={`font-mono tabular-nums ${winner === 'a' ? 'text-muted' : ''}`}>{fmt(b.score)}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2"><TeamName memberId={b.memberId} year={year} /><TeamLogo ffuId={b.memberId} size={22} /></span>
    </div>
  )
}

/** Each side's projected final score, under its actual one — only while either side has one. */
function Projections({ a, b }: { a: BoxScoreSide; b: BoxScoreSide }) {
  if (a.projected === undefined && b.projected === undefined) return null
  const proj = (n: number | undefined) => (n === undefined ? '' : n.toFixed(1))
  return (
    <div className={`${COLS} ${ROW_PAD} bg-surface-2/40 py-1 text-[10px] text-muted sm:text-xs`}>
      <span />
      <span className="text-right font-mono tabular-nums">{proj(a.projected)}</span>
      <span className="text-center font-semibold uppercase">Proj</span>
      <span className="font-mono tabular-nums">{proj(b.projected)}</span>
      <span />
    </div>
  )
}

/** Head-to-head lineups (+ bench): slot label centered + color-coded, scores flanking it, names on the
 *  outer edges. Only the losing side's team score is dimmed (ties dim neither). `liveOf` (live only)
 *  marks where each player's NFL game stands and when/who they play. */
export function BoxScore({
  slots,
  players,
  year,
  sides,
  liveOf,
}: {
  slots: string[]
  players: PlayerMap
  year: string
  sides: [BoxScoreSide, BoxScoreSide]
  liveOf?: LiveOf
}) {
  const [a, b] = sides
  const winner: 'a' | 'b' | null = a.score === b.score ? null : a.score > b.score ? 'a' : 'b'
  return (
    <>
      <Heads a={a} b={b} year={year} winner={winner} />
      <Projections a={a} b={b} />
      <StarterRows slots={slots} a={a.lineup} b={b.lineup} players={players} liveOf={liveOf} />
      <BenchSection a={a.lineup} b={b.lineup} players={players} liveOf={liveOf} />
    </>
  )
}
