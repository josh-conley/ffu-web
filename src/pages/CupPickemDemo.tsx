import { Link, useSearchParams } from 'react-router-dom'
import { CUP_ACCENT } from '@/config'
import { DEMO_YEAR } from '@/data/pickemDemo'
import { usePickemDemoCup } from '@/hooks/usePickemDemoCup'
import { PickemPanel } from '@/components/cup/pickem/PickemPanel'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { segButton } from '@/components/controls'

// Preview builds only (routed when PICKEM_DEMO): the Pick'em tab exactly as members will see it,
// over a demo Cup and an in-browser store, with a switch between "entries open" and "locked".

export function CupPickemDemo() {
  const { tournament, seasons, played, loading, error } = usePickemDemoCup()
  const [params] = useSearchParams()
  const locked = params.get('demo') === 'locked'

  if (error) return <ErrorMessage error={error} />
  if (loading || !tournament || !seasons) return <LoadingSpinner />
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: CUP_ACCENT }}>Preview demo</p>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Cup pick&apos;em</h1>
        <p className="max-w-3xl text-sm text-muted">
          A demo draw over the {DEMO_YEAR} teams. Entries are saved only in this browser, and six rival brackets
          are filled in. &ldquo;Locked&rdquo; shows the leaderboard, scored against the real {DEMO_YEAR} weeks.
        </p>
      </header>
      <nav aria-label="Demo state" className="flex gap-2">
        <Link to="?" className={segButton(!locked)} aria-current={!locked ? 'page' : undefined}>Entries open</Link>
        <Link to="?demo=locked" className={segButton(locked)} aria-current={locked ? 'page' : undefined}>Locked</Link>
      </nav>
      <PickemPanel key={String(locked)} tournament={tournament} played={played} seasons={seasons} year={DEMO_YEAR} />
    </div>
  )
}
