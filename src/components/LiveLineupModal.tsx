import { useEffect, useRef } from 'react'
import type { Game } from '@/data'
import { useLiveBoxScore } from '@/hooks/useLiveBoxScore'
import { BoxScore, type BoxScoreSide } from './BoxScore'
import { LoadingSpinner } from './LoadingSpinner'

/** Live counterpart to LineupModal.tsx — same BoxScore body, sourced from Sleeper at click time
 *  (the static lineups file this normally reads doesn't exist yet for an in-progress season). */
export function LiveLineupModal({ leagueId, year, game, onClose }: { leagueId: string; year: string; game: Game; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const [p0, p1] = game.participants
  const memberIds: [string, string] = [p0?.memberId ?? '', p1?.memberId ?? '']
  const { data, loading } = useLiveBoxScore(leagueId, game.week, memberIds, true)

  const sides: BoxScoreSide[] = data
    ? data.teams.map((lineup) => ({ memberId: lineup.memberId, score: game.participants.find((p) => p.memberId === lineup.memberId)?.score ?? 0, lineup }))
    : []
  const [sideA, sideB] = sides

  return (
    <div role="dialog" aria-modal="true" aria-label="Game lineups" onClick={onClose} className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-auto border border-border bg-surface shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-accent px-4 py-2.5 text-accent-fg">
          <span className="text-sm font-bold uppercase tracking-wide">Week {game.week} · Live</span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-lg leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text">✕</button>
        </header>
        {loading ? (
          <div className="p-10"><LoadingSpinner /></div>
        ) : data && sideA && sideB ? (
          <BoxScore slots={data.slots} players={data.players} year={year} sides={[sideA, sideB]} />
        ) : (
          <p className="p-6 text-sm text-muted">Lineups aren't available for this game.</p>
        )}
      </div>
    </div>
  )
}
