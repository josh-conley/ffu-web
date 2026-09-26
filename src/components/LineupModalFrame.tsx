import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getMember } from '@/config'
import { useSeriesStanding } from '@/hooks/useSeriesStanding'
import { Dialog } from './Dialog'
import { SeriesTag } from './SeriesTag'
import { memberProfileHref } from './teamProfile'

/** One plain link per team to its full profile, named so the two can't be mistaken for each other. */
function ProfileLinks({ memberIds, onNavigate }: { memberIds: readonly string[]; onNavigate: () => void }) {
  return (
    <footer className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-border px-4 py-3 text-sm">
      {memberIds.map((id) => (
        <Link key={id} to={memberProfileHref(id)} onClick={onNavigate} className="font-medium text-accent hover:underline">
          {getMember(id)?.name ?? id} profile →
        </Link>
      ))}
    </footer>
  )
}

/**
 * What both lineup modals share (LineupModal for a finished season, LiveLineupModal for the current
 * one): the Dialog, with the pair's all-time series in its title bar (the stat the commissioner
 * otherwise digs out of Compare) and a profile link for each team under the box score.
 */
export function LineupModalFrame({
  title,
  memberIds,
  onClose,
  children,
}: {
  title: string
  memberIds: readonly string[]
  onClose: () => void
  children: ReactNode
}) {
  const series = useSeriesStanding(memberIds)
  const heading = (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span>{title}</span>
      {series && <span><span aria-hidden="true">· </span><SeriesTag standing={series} /></span>}
    </span>
  )

  return (
    <Dialog label="Game lineups" title={heading} width="lg" onClose={onClose}>
      {children}
      <ProfileLinks memberIds={memberIds} onNavigate={onClose} />
    </Dialog>
  )
}
