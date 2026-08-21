import { useEffect, useMemo, useState } from 'react'
import { FaVolumeHigh, FaVolumeXmark } from 'react-icons/fa6'
import { CUP_ACCENT, CUP_NAME } from '@/config'
import type { SeasonData } from '@/data'
import { browserVoice, tiePhrases } from '@/lib/announcer'
import { drawCup, type CupField } from '@/lib/cupDraw.mjs'
import { formatDrawCsv, formatDrawSheet } from '@/lib/drawSheet.mjs'
import { tieStory } from '@/selectors'
import { SPIN_MS, useCupDrawReveal } from '@/hooks/useCupDrawReveal'
import { DrawBowl } from './DrawBowl'
import { DrawReel } from './DrawReel'
import { TieStoryLine } from './TieStoryLine'
import { DrawLedger } from './DrawLedger'
import { DrawTieCard } from './DrawTieCard'
import { downloadText } from './downloads'

// The stage. Built for a stream: the operator drives it with the space bar (nothing to see on
// camera), type is large, and the seed stays on screen throughout as proof it was fixed up front.

function TopBar({ seed, tieNumber, done }: { seed: string; tieNumber: number; done: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 pb-2" style={{ borderColor: CUP_ACCENT }}>
      <h1 className="text-xl font-extrabold uppercase tracking-tight sm:text-2xl">{CUP_NAME} Draw</h1>
      <div className="flex items-baseline gap-4 font-mono text-xs uppercase tracking-widest text-muted">
        <span>
          seed <span className="font-bold text-text">{seed}</span>
        </span>
        <span>{done ? 'complete' : `tie ${tieNumber} of 18`}</span>
      </div>
    </div>
  )
}

function Controls({ done, label, muted, onAdvance, onToggleMute, onDownload }: {
  done: boolean
  /** Reads what the next press will do: draw, cut the spin short, or move on. */
  label: string
  muted: boolean
  onAdvance: () => void
  onToggleMute: () => void
  onDownload: (kind: 'txt' | 'csv') => void
}) {
  const button = 'min-h-11 border border-border px-4 py-1.5 text-sm font-bold uppercase tracking-wide hover:bg-surface-2 md:min-h-0'
  return (
    <div className="flex flex-wrap items-center gap-3">
      {!done && (
        <button
          type="button"
          onClick={onAdvance}
          className="min-h-11 border px-6 py-2 text-sm font-extrabold uppercase tracking-wide text-white md:min-h-0"
          style={{ backgroundColor: CUP_ACCENT, borderColor: CUP_ACCENT }}
        >
          {label}
        </button>
      )}
      {!done && <span className="text-xs uppercase tracking-widest text-muted">or press space</span>}
      <span className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute the wheel' : 'Mute the wheel'}
          className={button}
        >
          {muted ? <FaVolumeXmark aria-hidden /> : <FaVolumeHigh aria-hidden />}
        </button>
        <button type="button" onClick={() => onDownload('txt')} className={button}>
          Download sheet
        </button>
        <button type="button" onClick={() => onDownload('csv')} className={button}>
          CSV
        </button>
      </span>
    </div>
  )
}

/** What to do once the last tie has landed. */
function CompleteBanner({ seed }: { seed: string }) {
  return (
    <div className="border-2 bg-surface p-4 text-center" style={{ borderColor: CUP_ACCENT }}>
      <p className="text-lg font-extrabold uppercase tracking-tight">The draw is complete</p>
      <p className="mt-1 text-sm text-muted">
        Record the seed <span className="font-mono font-bold text-text">{seed}</span>, then run{' '}
        <code className="font-mono">npm run draw-cup -- --seed {seed}</code> to write the official bracket.
      </p>
    </div>
  )
}

/** The tie on the stage: nameplates, the reveal reel while it spins, then the storyline. */
function CurrentTie({ reveal, story, muted }: {
  reveal: ReturnType<typeof useCupDrawReveal>
  story: ReturnType<typeof tieStory> | undefined
  muted: boolean
}) {
  const { drawer, drawn, phase } = reveal
  if (!drawer) return null
  return (
    <div className="space-y-3">
      <DrawTieCard drawer={drawer} drawn={drawn} tieNumber={reveal.tieNumber} />
      {phase === 'spinning' && reveal.spinWinner !== undefined && (
        <DrawReel pool={reveal.spinPool} winnerId={reveal.spinWinner} durationMs={SPIN_MS} muted={muted} />
      )}
      {story && drawn && (
        <div className="border border-border bg-surface px-4 pb-3 pt-1">
          <TieStoryLine story={story} aName={drawer.name} bName={drawn.name} />
        </div>
      )}
    </div>
  )
}

export function DrawStage({ field, seed, seasons, onRestart }: {
  field: CupField
  seed: string
  /** Completed seasons, for each tie's head-to-head story. Empty just hides the storyline. */
  seasons: SeasonData[]
  onRestart: () => void
}) {
  // Decided once, here, before anything is shown. The reveal below is presentation over a result
  // that already exists — the animation cannot change who was drawn.
  const result = useMemo(() => drawCup(field, seed), [field, seed])
  const reveal = useCupDrawReveal(field, result)
  const { advance, drawer, drawn } = reveal
  // Sound is on by default: this is an operator view for a broadcast, not a page anyone stumbles on.
  const [muted, setMuted] = useState(false)

  const story = useMemo(
    () => (drawer && drawn && seasons.length > 0 ? tieStory(seasons, drawer.ffuId, drawn.ffuId) : undefined),
    [seasons, drawer, drawn],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space' && e.code !== 'Enter') return
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement) return
      e.preventDefault()
      advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance])

  // Call the tie the moment it lands. Cancelled on unmount (or a fast next press) so two ties can
  // never talk over each other.
  useEffect(() => {
    if (reveal.phase !== 'shown' || muted || !drawer || !drawn) return
    browserVoice.speak(tiePhrases(drawer, drawn, story?.meetings === 0))
    return () => browserVoice.cancel()
    // Keyed on the tie number so it fires once per tie, not on every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal.phase, reveal.tieNumber, muted])

  const buttonLabel =
    reveal.phase === 'spinning' ? 'Reveal' : reveal.phase === 'shown' ? 'Next tie' : 'Draw'

  const download = (kind: 'txt' | 'csv') =>
    kind === 'csv'
      ? downloadText(`ffu-cup-draw-${seed}.csv`, formatDrawCsv(field, result, seed), 'text/csv')
      : downloadText(`ffu-cup-draw-${seed}.txt`, formatDrawSheet(field, result, seed), 'text/plain')

  return (
    <div className="space-y-5">
      <TopBar seed={seed} tieNumber={reveal.tieNumber} done={reveal.done} />

      <CurrentTie reveal={reveal} story={story} muted={muted} />

      {reveal.done && <CompleteBanner seed={seed} />}

      <Controls
        done={reveal.done}
        label={buttonLabel}
        muted={muted}
        onAdvance={advance}
        onToggleMute={() => setMuted((m) => !m)}
        onDownload={download}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">The bowl</h2>
          <DrawBowl
            masters={reveal.mastersBowl}
            national={reveal.nationalBowl}
            mastersClosed={reveal.mastersClosed}
            nationalClosed={reveal.nationalClosed}
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Ties so far</h2>
          <DrawLedger ties={reveal.ledger} />
        </div>
      </div>

      <button type="button" onClick={onRestart} className="text-xs uppercase tracking-widest text-muted hover:text-accent">
        ← Start over with a different seed
      </button>
    </div>
  )
}
