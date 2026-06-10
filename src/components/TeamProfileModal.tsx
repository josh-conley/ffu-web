import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getMember, ownerNames } from '@/config'
import { careerFor, currentLeague, type CareerStats } from '@/selectors'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { TeamLogo } from './TeamLogo'
import { LeagueBadge } from './LeagueBadge'
import { LoadingSpinner } from './LoadingSpinner'
import { TierTimeline } from './TierTimeline'
import { TrophyCase } from './TrophyCase'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-t-[3px] border-t-accent bg-surface-2 p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-text">{value}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">{children}</div>
}

/** "Josh · 2021–2024 · 4 seasons" — owners (or a TBD) plus tenure when the member has played. */
function ownerLine(ffuId: string, career: CareerStats | undefined): string {
  const owners = ownerNames(ffuId)
  const parts = [owners.length > 0 ? owners.join(' / ') : 'Owner TBD']
  if (career?.firstYear != null) {
    parts.push(`${career.firstYear}–${career.lastYear}`, `${career.seasons} season${career.seasons === 1 ? '' : 's'}`)
  }
  return parts.join(' · ')
}

function Profile({ ffuId, career }: { ffuId: string; career: CareerStats | undefined }) {
  const member = getMember(ffuId)
  const league = career ? currentLeague(career) : undefined
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <TeamLogo ffuId={ffuId} size={56} clickable={false} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold leading-tight tracking-tight">{member?.name ?? ffuId}</span>
            {league && <LeagueBadge tier={league} />}
          </div>
          <div className="text-sm text-muted">{ownerLine(ffuId, career)}</div>
        </div>
      </div>
      {career ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Record" value={`${career.wins}-${career.losses}${career.ties > 0 ? `-${career.ties}` : ''}`} />
            <Stat label="Win %" value={`${(career.winPct * 100).toFixed(1)}%`} />
          </div>
          <div>
            <SectionLabel>Trophy Case</SectionLabel>
            <TrophyCase career={career} />
          </div>
          <div>
            <SectionLabel>League Progression</SectionLabel>
            <TierTimeline seasons={career.finishes} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">No seasons played yet.</p>
      )}
    </div>
  )
}

/** Global quick-profile popup, opened by clicking any TeamLogo (via TeamProfileProvider). */
export function TeamProfileModal({ ffuId, onClose }: { ffuId: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { data: seasons, loading } = useAllSeasons()
  const career = useMemo(() => (seasons ? careerFor(seasons, ffuId) : undefined), [seasons, ffuId])

  return (
    <div role="dialog" aria-modal="true" aria-label="Team profile" onClick={onClose} className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-auto border border-border bg-surface shadow-xl">
        <header className="flex items-center justify-between border-b border-border bg-accent px-4 py-2.5 text-accent-fg">
          <span className="text-sm font-bold uppercase tracking-wide">Team Profile</span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-lg leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text">✕</button>
        </header>
        {loading ? (
          <div className="p-10"><LoadingSpinner /></div>
        ) : (
          <Profile ffuId={ffuId} career={career} />
        )}
        <footer className="border-t border-border px-4 py-3 text-sm">
          <Link to={`/members?member=${ffuId}`} onClick={onClose} className="font-medium text-accent hover:underline">
            View full profile →
          </Link>
        </footer>
      </div>
    </div>
  )
}
