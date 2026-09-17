import { useEffect, useRef } from 'react'
import { useLiveBoxScore } from '@/hooks/useLiveBoxScore'
import { starterPoints } from '@/selectors'
import { BoxScore, type BoxScoreSide } from './BoxScore'
import { LoadingSpinner } from './LoadingSpinner'

/**
 * Live counterpart to LineupModal.tsx — same BoxScore body, sourced from Sleeper at click time
 * (the static lineups file this normally reads doesn't exist yet for an in-progress season).
 *
 * Takes a week and two members rather than a Game, because the useful cases include weeks that
 * aren't games yet: the one being played, and the ones still to come, where Sleeper knows the
 * lineups but there is no result to read. `scoreOf` supplies the score to head each side with when
 * a game does exist; without it the starters' own total stands in (0.00 before kickoff).
 */
export function LiveLineupModal({
  leagueId,
  year,
  week,
  memberIds,
  scoreOf,
  onClose,
}: {
  leagueId: string
  year: string
  week: number
  memberIds: [string, string]
  scoreOf?: (memberId: string) => number | undefined
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { data, loading } = useLiveBoxScore(leagueId, week, memberIds, true)

  const sides: BoxScoreSide[] = data
    ? data.teams.map((lineup) => ({ memberId: lineup.memberId, score: scoreOf?.(lineup.memberId) ?? starterPoints(lineup), lineup }))
    : []
  const [sideA, sideB] = sides

  return (
    <div role="dialog" aria-modal="true" aria-label="Game lineups" onClick={onClose} className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-auto border border-border bg-surface shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-accent px-4 py-2.5 text-accent-fg">
          <span className="text-sm font-bold uppercase tracking-wide">Week {week} · Live</span>
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
