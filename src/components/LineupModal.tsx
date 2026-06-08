import { useEffect, useRef } from 'react'
import type { Game, LineupPlayer, PlayerMap, TeamLineup } from '@/data'
import type { Tier } from '@/config'
import { nameForYear } from '@/config'
import { useLineups, usePlayers } from '@/hooks/useLeagueData'
import { benchByPoints, gameLineups, winnerOf } from '@/selectors'
import { TeamLogo } from './TeamLogo'
import { LoadingSpinner } from './LoadingSpinner'

function PlayerRow({ p, players, dim }: { p: LineupPlayer; players: PlayerMap; dim?: boolean }) {
  const info = players[p.playerId]
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm ${dim ? 'text-muted' : ''}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="w-8 shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted">{info?.position ?? '—'}</span>
        <span className="truncate">{info?.name ?? p.playerId}</span>
        {info?.team && <span className="shrink-0 text-[10px] text-muted">{info.team}</span>}
      </span>
      <span className="shrink-0 font-mono tabular-nums">{p.points.toFixed(2)}</span>
    </div>
  )
}

function TeamColumn({ team, year, players, total, isWinner }: { team: TeamLineup; year: string; players: PlayerMap; total: number; isWinner: boolean }) {
  return (
    <div>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 ${isWinner ? 'bg-surface-2 font-semibold' : 'text-muted'}`}>
        <span className="flex min-w-0 items-center gap-2">
          <TeamLogo ffuId={team.memberId} size={22} />
          <span className="truncate">{nameForYear(team.memberId, year) ?? team.memberId}</span>
        </span>
        <span className="shrink-0 font-mono font-bold tabular-nums text-text">{total.toFixed(2)}</span>
      </div>
      <div className="divide-y divide-border/60">
        {team.starters.map((p, i) => (
          <PlayerRow key={i} p={p} players={players} />
        ))}
      </div>
      <div className="bg-surface-2/40 px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted">Bench</div>
      <div className="divide-y divide-border/60">
        {benchByPoints(team).map((p, i) => (
          <PlayerRow key={i} p={p} players={players} dim />
        ))}
      </div>
    </div>
  )
}

/** Modal showing both starting lineups (+ bench) for a game, winner emphasized. Lazy-loads the
 *  season's lineups + the player map only when opened. */
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
  const loading = lineups.loading || players.loading
  const teams = lineups.data ? gameLineups(lineups.data, game.week, game.participants.map((p) => p.memberId)) : []
  const winner = winnerOf(game)
  const scoreOf = (id: string) => game.participants.find((p) => p.memberId === id)?.score ?? 0

  return (
    <div role="dialog" aria-modal="true" aria-label="Game lineups" onClick={onClose} className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-auto border border-border bg-surface shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-accent px-4 py-2.5 text-accent-fg">
          <span className="text-sm font-bold uppercase tracking-wide">Week {game.week}{game.round ? ` · ${game.round}` : ''}</span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-lg leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text">
            ✕
          </button>
        </header>
        {loading && <div className="p-10"><LoadingSpinner /></div>}
        {!loading && teams.length < 2 && <p className="p-6 text-sm text-muted">Lineups aren't available for this game.</p>}
        {!loading && teams.length === 2 && (
          <div className="grid grid-cols-2 divide-x divide-border">
            {teams.map((t) => (
              <TeamColumn key={t.memberId} team={t} year={year} players={players.data ?? {}} total={scoreOf(t.memberId)} isWinner={t.memberId === winner} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
