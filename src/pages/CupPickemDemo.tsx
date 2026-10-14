import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CUP_ACCENT } from '@/config'
import { DEMO_YEAR, onePickFromDrop } from '@/data/pickemDemo'
import { writeDraft } from '@/hooks/usePickemForm'
import { usePickemDemoCup } from '@/hooks/usePickemDemoCup'
import { PickemPanel } from '@/components/cup/pickem/PickemPanel'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { BUTTON, segButton } from '@/components/controls'

// Preview builds only (routed when PICKEM_DEMO): the Pick'em tab exactly as members will see it,
// over a demo Cup and an in-browser store, with a switch between "entries open" and "locked", and a
// button that sets the member's bracket one pick short of the drop pick, to try that prompt.

const SEEDED = 'ffu-pickem-demo-seeded'

/** True the first time this browser opens the demo (so it starts one pick from the drop). */
function firstVisit(): boolean {
  try {
    if (window.localStorage.getItem(SEEDED)) return false
    window.localStorage.setItem(SEEDED, '1')
    return true
  } catch {
    return false
  }
}

export function CupPickemDemo() {
  const { tournament, seasons, played, loading, error } = usePickemDemoCup()
  const [params] = useSearchParams()
  const locked = params.get('demo') === 'locked'
  // Bumped to remount the panel, so it reads the bracket just written.
  const [run, setRun] = useState(0)
  const [seeded, setSeeded] = useState(false)
  const nearDrop = () => {
    if (!tournament) return
    writeDraft(DEMO_YEAR, { ffuId: '', picks: onePickFromDrop(tournament) })
    setRun((n) => n + 1)
  }
  if (tournament && !seeded) {
    setSeeded(true)
    if (firstVisit()) writeDraft(DEMO_YEAR, { ffuId: '', picks: onePickFromDrop(tournament) })
  }

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
      <nav aria-label="Demo state" className="flex flex-wrap gap-2">
        <Link to="?" className={segButton(!locked)} aria-current={!locked ? 'page' : undefined}>Entries open</Link>
        <Link to="?demo=locked" className={segButton(locked)} aria-current={locked ? 'page' : undefined}>Locked</Link>
        {!locked && <button type="button" className={BUTTON} onClick={nearDrop}>Start one pick from the drop</button>}
      </nav>
      <PickemPanel key={`${locked}-${run}`} tournament={tournament} played={played} seasons={seasons} year={DEMO_YEAR} />
    </div>
  )
}
