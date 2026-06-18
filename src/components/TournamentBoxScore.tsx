import { useEffect, useRef } from 'react'
import type { SeasonLineups } from '@/data'
import { useLineups, usePlayers } from '@/hooks/useLeagueData'
import { gameLineups } from '@/selectors'
import type { ResolvedMatchup, ResolvedSide } from '@/selectors/tournament'
import { BoxScore, type BoxScoreSide } from './BoxScore'
import { LeagueBadge } from './LeagueBadge'
import { LoadingSpinner } from './LoadingSpinner'

/** Build one BoxScore side by pulling this team's lineup from its OWN tier's file for the week. */
function buildSide(side: ResolvedSide, data: SeasonLineups | null | undefined, week: number): BoxScoreSide | undefined {
  if (data === null || data === undefined) return undefined
  const [lineup] = gameLineups(data, week, [side.ffuId])
  if (lineup === undefined) return undefined
  return { memberId: side.ffuId, score: side.score ?? 0, lineup }
}

/** Box score for a cross-tier tournament matchup. The two teams live in (possibly) different tiers,
 *  so each side's lineup is lazy-loaded from its own tier file; slots are identical across tiers. */
export function TournamentBoxScore({ year, week, label, matchup, onClose }: { year: string; week: number; label: string; matchup: ResolvedMatchup; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const players = usePlayers()
  const lineupsA = useLineups(matchup.a.tier, year)
  const lineupsB = useLineups(matchup.b.tier, year)
  const loading = players.loading || lineupsA.loading || lineupsB.loading

  const a = buildSide(matchup.a, lineupsA.data, week)
  const b = buildSide(matchup.b, lineupsB.data, week)
  const slots = lineupsA.data?.slots ?? lineupsB.data?.slots ?? []

  return (
    <div role="dialog" aria-modal="true" aria-label="Tournament lineups" onClick={onClose} className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-auto border border-border bg-surface shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-accent px-4 py-2.5 text-accent-fg">
          <span className="text-sm font-bold uppercase tracking-wide">{label} · Week {week}</span>
          <span className="flex items-center gap-1.5">
            <LeagueBadge tier={matchup.a.tier} />
            <LeagueBadge tier={matchup.b.tier} />
          </span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-lg leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text">✕</button>
        </header>
        {loading ? (
          <div className="p-10"><LoadingSpinner /></div>
        ) : a && b ? (
          <BoxScore slots={slots} players={players.data ?? {}} year={year} sides={[a, b]} />
        ) : (
          <p className="p-6 text-sm text-muted">Lineups aren't available for this matchup.</p>
        )}
      </div>
    </div>
  )
}
