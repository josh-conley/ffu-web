import { useEffect, useMemo, useState } from 'react'
import type { SeasonData } from '@/data'
import { drawCheckCode, drawCup, type CupField } from '@/lib/cupDraw.mjs'
import { formatDrawCsv, formatDrawSheet } from '@/lib/drawSheet.mjs'
import { matchupStory } from '@/selectors'
import { SPIN_MS, TOTAL_MATCHUPS, useCupDrawReveal } from '@/hooks/useCupDrawReveal'
import { useSpaceToAdvance } from '@/hooks/useSpaceToAdvance'
import { DrawBowl } from './DrawBowl'
import { DrawComplete } from './DrawComplete'
import { DrawControls, RestartButton } from './DrawControls'
import { DrawLedger } from './DrawLedger'
import { DrawMatchupCard } from './DrawMatchupCard'
import { DrawReel } from './DrawReel'
import { DrawTopBar } from './DrawTopBar'
import { MatchupStoryLine } from './MatchupStoryLine'
import { downloadText } from './downloads'

// The stage. Built for a stream: the operator drives it with the space bar (nothing to see on
// camera), type is large, and the seed stays on screen throughout as proof it was fixed up front.

/** The matchup on the stage: nameplates, the reveal reel while it spins and lands, then the storyline. */
function CurrentMatchup({ reveal, story, muted }: {
  reveal: ReturnType<typeof useCupDrawReveal>
  story: ReturnType<typeof matchupStory> | undefined
  muted: boolean
}) {
  const { drawer, drawn, phase, landing } = reveal
  if (!drawer) return null
  const reelUp = (phase === 'spinning' || landing) && reveal.spinWinner !== undefined
  return (
    <div className="space-y-3">
      <DrawMatchupCard drawer={drawer} drawn={landing ? undefined : drawn} forced={reveal.forced} />
      {reelUp && (
        <DrawReel pool={reveal.spinPool} winnerId={reveal.spinWinner!} durationMs={SPIN_MS} muted={muted} landed={landing} />
      )}
      {story && drawn && !landing && (
        <div className="border border-border bg-surface px-4 py-3">
          <MatchupStoryLine story={story} aName={drawer.name} bName={drawn.name} />
        </div>
      )}
    </div>
  )
}

/** Mid-draw: who is left to be drawn, and what has been drawn so far. */
function BowlAndLedger({ reveal }: { reveal: ReturnType<typeof useCupDrawReveal> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">The bowl</h2>
        <DrawBowl
          masters={reveal.mastersBowl}
          national={reveal.nationalBowl}
          mastersClosed={reveal.mastersClosed}
          nationalClosed={reveal.nationalClosed}
        />
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Matchups so far</h2>
        <DrawLedger matchups={reveal.ledger} />
      </div>
    </div>
  )
}

export function DrawStage({ field, seed, seasons, onRestart, resumeAt = 0, onProgress }: {
  field: CupField
  seed: string
  /** Completed seasons, for each matchup's head-to-head story. Empty just hides the storyline. */
  seasons: SeasonData[]
  onRestart: () => void
  /** Matchups already shown, when resuming a draw after a reload. */
  resumeAt?: number
  /** Told how many matchups are on screen after each step, so the page can make it resumable. */
  onProgress?: (settled: number) => void
}) {
  // Decided once, here, before anything is shown. The reveal below is presentation over a result
  // that already exists — the animation cannot change who was drawn.
  const result = useMemo(() => drawCup(field, seed), [field, seed])
  const reveal = useCupDrawReveal(field, result, resumeAt)
  const { advance, drawer, drawn, settled } = reveal
  // Sound is on by default: this is an operator view for a broadcast, not a page anyone stumbles on.
  const [muted, setMuted] = useState(false)

  useSpaceToAdvance(advance)
  useEffect(() => onProgress?.(settled), [onProgress, settled])

  const story = useMemo(
    () => (drawer && drawn && seasons.length > 0 ? matchupStory(seasons, drawer.ffuId, drawn.ffuId) : undefined),
    [seasons, drawer, drawn],
  )

  const lastShown = reveal.phase === 'shown' && reveal.matchupNumber === TOTAL_MATCHUPS
  const buttonLabel =
    reveal.phase === 'spinning' ? 'Reveal' : lastShown ? 'Show all matchups' : reveal.phase === 'shown' ? 'Next matchup' : 'Draw'

  const download = (kind: 'txt' | 'csv') =>
    kind === 'csv'
      ? downloadText(`ffu-cup-draw-${seed}.csv`, formatDrawCsv(field, result, seed), 'text/csv')
      : downloadText(`ffu-cup-draw-${seed}.txt`, formatDrawSheet(field, result, seed), 'text/plain')

  return (
    <div className="space-y-5">
      <DrawTopBar seed={seed} matchupNumber={reveal.matchupNumber} done={reveal.done} />
      <DrawControls
        done={reveal.done}
        label={buttonLabel}
        muted={muted}
        onAdvance={advance}
        onToggleMute={() => setMuted((m) => !m)}
      />
      {reveal.done ? (
        <DrawComplete
          seed={seed}
          checkCode={drawCheckCode(result)}
          matchups={reveal.ledger}
          seasons={seasons}
          onDownload={download}
        />
      ) : (
        <>
          <CurrentMatchup reveal={reveal} story={story} muted={muted} />
          <BowlAndLedger reveal={reveal} />
        </>
      )}
      <RestartButton drawnAny={settled > 0} onRestart={onRestart} />
    </div>
  )
}
