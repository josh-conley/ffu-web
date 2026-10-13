import { useState, type MouseEvent, type ReactNode } from 'react'
import { FaCodeCompare, FaListUl } from 'react-icons/fa6'
import { Link } from 'react-router-dom'
import { getMember } from '@/config'
import { useSeriesStanding } from '@/hooks/useSeriesStanding'
import { CompareBody } from './compare/CompareBody'
import { BUTTON } from './controls'
import { Dialog } from './Dialog'
import { SeriesTag } from './SeriesTag'
import { memberProfileHref } from './teamProfile'

type View = 'matchup' | 'compare'

const PROFILE_LINK = 'min-w-0 font-medium text-accent hover:underline'

/**
 * A profile link per team, named so the two can't be mistaken for each other, and between them the
 * switch between the game and the two teams' Compare view.
 */
function Footer({ memberIds, view, onToggle, onNavigate }: { memberIds: readonly string[]; view: View; onToggle: (e: MouseEvent<HTMLButtonElement>) => void; onNavigate: () => void }) {
  const [a, b] = memberIds
  const link = (id: string | undefined, align: string) =>
    id && (
      <Link to={memberProfileHref(id)} onClick={onNavigate} className={`${PROFILE_LINK} ${align}`}>
        {getMember(id)?.name ?? id} profile →
      </Link>
    )
  const Icon = view === 'matchup' ? FaCodeCompare : FaListUl
  return (
    <footer className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-t border-border px-4 py-3 text-sm">
      {link(a, 'justify-self-start')}
      {a && b ? (
        <button type="button" onClick={onToggle} className={BUTTON}>
          <Icon aria-hidden />
          {view === 'matchup' ? 'Compare' : 'Matchup'}
        </button>
      ) : (
        <span />
      )}
      {link(b, 'justify-self-end text-right')}
    </footer>
  )
}

/**
 * What every matchup modal shares (LineupModal for a finished season, LiveLineupModal for the
 * current one, CupMatchupModal for the Cup): the Dialog, with the pair's all-time series in its
 * title bar (the stat the commissioner otherwise digs out of Compare), and a footer with each
 * team's profile link either side of a Compare switch, which swaps the box score for the two
 * teams' Compare view (the Members page's) and back.
 *
 * The box score stays mounted, just hidden, while Compare is up: switching back is instant and
 * doesn't read Sleeper again.
 */
export function LineupModalFrame({
  title,
  memberIds,
  action,
  onClose,
  children,
}: {
  title: ReactNode
  memberIds: readonly string[]
  /** A control for the title bar, beside the close button. */
  action?: ReactNode
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
    // The switch sits at the foot of the dialog; start the other view from its top.
    const dialog = e.currentTarget.closest('dialog')
    if (dialog) dialog.scrollTop = 0
  }

  return (
    <Dialog label="Game lineups" title={heading} width="lg" action={action} onClose={onClose}>
      <div hidden={view === 'compare'}>{children}</div>
      {view === 'compare' && a && b && <CompareBody a={a} b={b} />}
      <Footer memberIds={memberIds} view={view} onToggle={toggle} onNavigate={onClose} />
    </Dialog>
  )
}
