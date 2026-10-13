import { useState, type MouseEvent, type ReactNode } from 'react'
import { FaCodeCompare, FaListUl } from 'react-icons/fa6'
import { Link } from 'react-router-dom'
import { getMember } from '@/config'
import { useSeriesStanding } from '@/hooks/useSeriesStanding'
import { CompareBody } from './compare/CompareBody'
import { Dialog } from './Dialog'
import { SeriesTag } from './SeriesTag'
import { memberProfileHref } from './teamProfile'

type View = 'matchup' | 'compare'

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

/** The title bar's switch between the game and the two teams' Compare view. */
function ViewToggle({ view, onToggle }: { view: View; onToggle: (e: MouseEvent<HTMLButtonElement>) => void }) {
  const Icon = view === 'matchup' ? FaCodeCompare : FaListUl
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-11 shrink-0 items-center gap-2 px-3 text-xs font-bold uppercase tracking-wide hover:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fg"
    >
      <Icon aria-hidden />
      {view === 'matchup' ? 'Compare' : 'Matchup'}
    </button>
  )
}

/**
 * What every matchup modal shares (LineupModal for a finished season, LiveLineupModal for the
 * current one, CupMatchupModal for the Cup): the Dialog, with the pair's all-time series in its
 * title bar (the stat the commissioner otherwise digs out of Compare) beside a Compare switch,
 * which swaps the box score for the two teams' Compare view (the Members page's) and back, and a
 * profile link for each team at the foot.
 *
 * The box score stays mounted, just hidden, while Compare is up: switching back is instant and
 * doesn't read Sleeper again.
 */
export function LineupModalFrame({
  title,
  memberIds,
  onClose,
  children,
}: {
  title: ReactNode
  memberIds: readonly string[]
  onClose: () => void
  children: ReactNode
}) {
  const series = useSeriesStanding(memberIds)
  const [view, setView] = useState<View>('matchup')
  const [a, b] = memberIds
  const heading = (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span>{title}</span>
      {series && <span><span aria-hidden="true">· </span><SeriesTag standing={series} /></span>}
    </span>
  )
  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    setView((v) => (v === 'matchup' ? 'compare' : 'matchup'))
    // Start the other view from its top, wherever the dialog was scrolled to.
    const dialog = e.currentTarget.closest('dialog')
    if (dialog) dialog.scrollTop = 0
  }

  return (
    <Dialog label="Game lineups" title={heading} width="lg" action={a && b && <ViewToggle view={view} onToggle={toggle} />} onClose={onClose}>
      <div hidden={view === 'compare'}>{children}</div>
      {view === 'compare' && a && b && <CompareBody a={a} b={b} />}
      <ProfileLinks memberIds={memberIds} onNavigate={onClose} />
    </Dialog>
  )
}
