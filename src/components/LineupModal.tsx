import { Fragment, useEffect, useRef } from 'react'
import type { Game, LineupPlayer, PlayerMap, TeamLineup } from '@/data'
import type { Tier } from '@/config'
import { nameForYear } from '@/config'
import { useLineups, usePlayers } from '@/hooks/useLeagueData'
import { benchByPoints, gameLineups, winnerOf } from '@/selectors'
import { posClass } from './positions'
import { TeamLogo } from './TeamLogo'
import { LoadingSpinner } from './LoadingSpinner'

const SLOT_LABEL: Record<string, string> = { SUPER_FLEX: 'SFLX', REC_FLEX: 'RFLX', WRRB_FLEX: 'W/R' }
const fmt = (n: number) => n.toFixed(2)
// 5 columns: name | score | slot | score | name — scores hug the centered slot badge.
const COLS = 'grid grid-cols-[minmax(0,1fr)_3rem_3.25rem_3rem_minmax(0,1fr)] items-center gap-x-2'

function PlayerName({ id, players, align, dim }: { id?: string; players: PlayerMap; align: 'left' | 'right'; dim?: boolean }) {
  const info = id ? players[id] : undefined
  const team = info?.team ? <span className="shrink-0 text-[10px] text-muted">{info.team}</span> : null
  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''} ${dim ? 'text-muted' : ''}`}>
      {align === 'right' && team}
      <span className="truncate">{info?.name ?? id ?? ''}</span>
      {align === 'left' && team}
    </span>
  )
}

function StarterRows({ slots, a, b, players, winner }: { slots: string[]; a: TeamLineup; b: TeamLineup; players: PlayerMap; winner: 'a' | 'b' | null }) {
  return (
    <div className={`${COLS} px-3 py-2 text-sm`}>
      {slots.map((slot, i) => (
        <Fragment key={i}>
          <PlayerName id={a.starters[i]?.playerId} players={players} align="left" dim={winner === 'b'} />
          <span className={`text-right font-mono tabular-nums ${winner === 'b' ? 'text-muted' : ''}`}>{fmt(a.starters[i]?.points ?? 0)}</span>
          <span className={`justify-self-center rounded px-1 text-[10px] font-bold ${posClass(slot)}`}>{SLOT_LABEL[slot] ?? slot}</span>
          <span className={`font-mono tabular-nums ${winner === 'a' ? 'text-muted' : ''}`}>{fmt(b.starters[i]?.points ?? 0)}</span>
          <PlayerName id={b.starters[i]?.playerId} players={players} align="right" dim={winner === 'a'} />
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
      <span className="min-w-0 flex-1 truncate">{info?.name ?? p.playerId}</span>
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

function Heads({ a, b, year, totalA, totalB, winner }: { a: TeamLineup; b: TeamLineup; year: string; totalA: number; totalB: number; winner: 'a' | 'b' | null }) {
  const name = (id: string) => nameForYear(id, year) ?? id
  return (
    <div className={`${COLS} border-b border-border px-3 py-2 text-sm font-semibold`}>
      <span className={`flex min-w-0 items-center gap-2 ${winner === 'b' ? 'text-muted' : ''}`}><TeamLogo ffuId={a.memberId} size={22} /><span className="truncate">{name(a.memberId)}</span></span>
      <span className={`text-right font-mono tabular-nums ${winner === 'b' ? 'text-muted' : ''}`}>{fmt(totalA)}</span>
      <span className="text-center text-[10px] text-muted">VS</span>
      <span className={`font-mono tabular-nums ${winner === 'a' ? 'text-muted' : ''}`}>{fmt(totalB)}</span>
      <span className={`flex min-w-0 items-center justify-end gap-2 ${winner === 'a' ? 'text-muted' : ''}`}><span className="truncate">{name(b.memberId)}</span><TeamLogo ffuId={b.memberId} size={22} /></span>
    </div>
  )
}

function winnerSide(game: Game, a: TeamLineup, b: TeamLineup): 'a' | 'b' | null {
  const w = winnerOf(game)
  return w === a.memberId ? 'a' : w === b.memberId ? 'b' : null
}

/** The resolved head-to-head body (only rendered once both lineups + slots are loaded). */
function Matchup({ game, year, slots, a, b, players }: { game: Game; year: string; slots: string[]; a: TeamLineup; b: TeamLineup; players: PlayerMap }) {
  const winner = winnerSide(game, a, b)
  const scoreOf = (id: string) => game.participants.find((p) => p.memberId === id)?.score ?? 0
  return (
    <>
      <Heads a={a} b={b} year={year} totalA={scoreOf(a.memberId)} totalB={scoreOf(b.memberId)} winner={winner} />
      <StarterRows slots={slots} a={a} b={b} players={players} winner={winner} />
      <BenchSection a={a} b={b} players={players} />
    </>
  )
}

/** Modal showing both starting lineups (+ bench) for a game in a head-to-head layout — slot label
 *  centered and color-coded, scores flanking it, player names on the outer edges. Lazy-loads. */
export function LineupModal({ tier, year, game, onClose }: { tier: Tier; year: string; game: Game; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const lineups = useLineups(tier, year)
  const players = usePlayers()
  const data = lineups.data
  const loading = lineups.loading || players.loading
  const teams = data ? gameLineups(data, game.week, game.participants.map((p) => p.memberId)) : []
  const [a, b] = teams

  return (
    <div role="dialog" aria-modal="true" aria-label="Game lineups" onClick={onClose} className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-auto border border-border bg-surface shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-accent px-4 py-2.5 text-accent-fg">
          <span className="text-sm font-bold uppercase tracking-wide">Week {game.week}{game.round ? ` · ${game.round}` : ''}</span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-lg leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text">✕</button>
        </header>
        {loading ? (
          <div className="p-10"><LoadingSpinner /></div>
        ) : data && a && b ? (
          <Matchup game={game} year={year} slots={data.slots} a={a} b={b} players={players.data ?? {}} />
        ) : (
          <p className="p-6 text-sm text-muted">Lineups aren't available for this game.</p>
        )}
      </div>
    </div>
  )
}
