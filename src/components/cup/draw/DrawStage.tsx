import { useEffect, useMemo, useState } from 'react'
import type { SeasonData } from '@/data'
import { drawCheckCode, drawCup, type CupField } from '@/lib/cupDraw.mjs'
import { formatDrawCsv, formatDrawSheet } from '@/lib/drawSheet.mjs'
import { matchupStory, matchupTag } from '@/selectors'
import { SPIN_MS, TOTAL_MATCHUPS, useCupDrawReveal } from '@/hooks/useCupDrawReveal'
import { useSpaceToAdvance } from '@/hooks/useSpaceToAdvance'
import { DrawBracket } from './DrawBracket'
import { DrawComplete } from './DrawComplete'
import { DrawControls, RestartButton } from './DrawControls'
import { DrawMatchupCard } from './DrawMatchupCard'
import { DrawReel } from './DrawReel'
import { DrawTopBar } from './DrawTopBar'
import { MatchupStoryLine } from './MatchupStoryLine'
import { downloadText } from './downloads'

// The stage. Built for a stream: the operator drives it with the space bar (nothing to see on
// camera), type is large, and the seed stays on screen throughout as proof it was fixed up front.
// Below the spinner, the Round of 36 bracket fills in as each matchup is drawn.

/**
 * The matchup on the stage: nameplates, the reel, then the storyline. Every part keeps its place
 * for the whole matchup — the reel stays up, and the storyline has a reserved slot — so nothing on
 * the stage jumps as a matchup moves from on the clock to drawn.
 */
function CurrentMatchup({ reveal, story, muted, storySlot }: {
  reveal: ReturnType<typeof useCupDrawReveal>
  story: ReturnType<typeof matchupStory> | undefined
  muted: boolean
  /** Reserve room for the storyline (false when there is no history to tell). */
  storySlot: boolean
}) {
  const { drawer, drawn, phase, landing } = reveal
  if (!drawer) return null
  const revealed = phase === 'shown' || phase === 'done'
  return (
    <div className="space-y-3">
      <DrawMatchupCard drawer={drawer} drawn={landing ? undefined : drawn} forced={reveal.forced} />
      <DrawReel
        key={reveal.matchupNumber}
        pool={reveal.spinPool}
        winnerId={phase === 'ready' ? undefined : reveal.spinWinner}
        durationMs={SPIN_MS}
        muted={muted}
        motion={phase === 'spinning' || landing ? 'spin' : 'still'}
        landed={revealed}
      />
      {storySlot && (
        <div className="min-h-14 border border-border bg-surface px-4 py-3">
          {story && drawn && !landing && <MatchupStoryLine story={story} aName={drawer.name} bName={drawn.name} />}
        </div>
      )}
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

  // Head-to-head tags for the finished bracket (the FFUN screenshot); not needed until the end.
  const tags = useMemo(
    () =>
      reveal.done && seasons.length > 0
        ? reveal.ledger.map((m) => matchupTag(matchupStory(seasons, m.a.ffuId, m.b.ffuId)))
        : [],
    [reveal.done, reveal.ledger, seasons],
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
        <DrawComplete seed={seed} checkCode={drawCheckCode(result)} onDownload={download}>
          <DrawBracket matchups={reveal.ledger} tags={tags} />
        </DrawComplete>
      ) : (
        <>
          <CurrentMatchup reveal={reveal} story={story} muted={muted} storySlot={seasons.length > 0} />
          <DrawBracket
            matchups={reveal.ledger}
            cursor={drawer && { index: reveal.matchupNumber - 1, drawer, drawn: reveal.landing ? undefined : drawn }}
          />
        </>
      )}
      <RestartButton drawnAny={settled > 0} onRestart={onRestart} />
    </div>
  )
}
