import { useEffect, useRef } from 'react'
import type { Game } from '@/data'
import type { Tier } from '@/config'
import { useLineups, usePlayers } from '@/hooks/useLeagueData'
import { gameLineups, scoreFor } from '@/selectors'
import { BoxScore, type BoxScoreSide } from './BoxScore'
import { LoadingSpinner } from './LoadingSpinner'

/** Modal showing both starting lineups (+ bench) for a single-tier game, lazy-loading that tier's
 *  lineups on open. The head-to-head body itself lives in the reusable BoxScore component. */
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
  const sides = teams.map((lineup): BoxScoreSide => ({ memberId: lineup.memberId, score: scoreFor(game, lineup.memberId) ?? 0, lineup }))
  const [sideA, sideB] = sides

  return (
    <div role="dialog" aria-modal="true" aria-label="Game lineups" onClick={onClose} className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-auto border border-border bg-surface shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-accent px-4 py-2.5 text-accent-fg">
          <span className="text-sm font-bold uppercase tracking-wide">Week {game.week}{game.round ? ` · ${game.round}` : ''}</span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-lg leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text">✕</button>
        </header>
        {loading ? (
          <div className="p-10"><LoadingSpinner /></div>
        ) : data && sideA && sideB ? (
          <BoxScore slots={data.slots} players={players.data ?? {}} year={year} sides={[sideA, sideB]} />
        ) : (
          <p className="p-6 text-sm text-muted">Lineups aren't available for this game.</p>
        )}
      </div>
    </div>
  )
}
