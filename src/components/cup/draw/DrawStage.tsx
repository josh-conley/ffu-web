import { useEffect, useMemo } from 'react'
import { CUP_ACCENT, CUP_NAME } from '@/config'
import { drawCup, type CupField } from '@/lib/cupDraw.mjs'
import { formatDrawCsv, formatDrawSheet } from '@/lib/drawSheet.mjs'
import { useCupDrawReveal } from '@/hooks/useCupDrawReveal'
import { DrawBowl } from './DrawBowl'
import { DrawLedger } from './DrawLedger'
import { DrawTieCard } from './DrawTieCard'
import { downloadText } from './downloads'

// The stage. Built for a stream: the operator drives it with the space bar (nothing to see on
// camera), type is large, and the seed stays on screen throughout as proof it was fixed up front.

function TopBar({ seed, revealed, done }: { seed: string; revealed: number; done: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 pb-2" style={{ borderColor: CUP_ACCENT }}>
      <h1 className="text-xl font-extrabold uppercase tracking-tight sm:text-2xl">{CUP_NAME} Draw</h1>
      <div className="flex items-baseline gap-4 font-mono text-xs uppercase tracking-widest text-muted">
        <span>
          seed <span className="font-bold text-text">{seed}</span>
        </span>
        <span>{done ? 'complete' : `tie ${Math.min(revealed + 1, 18)} of 18`}</span>
      </div>
    </div>
  )
}

function Controls({ done, spinning, onAdvance, onDownload }: {
  done: boolean
  spinning: boolean
  onAdvance: () => void
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
          {spinning ? 'Reveal' : 'Draw next'}
        </button>
      )}
      {!done && <span className="text-xs uppercase tracking-widest text-muted">or press space</span>}
      <span className="ml-auto flex gap-2">
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

export function DrawStage({ field, seed, onRestart }: { field: CupField; seed: string; onRestart: () => void }) {
  // Decided once, here, before anything is shown. The reveal below is presentation over a result
  // that already exists — the animation cannot change who was drawn.
  const result = useMemo(() => drawCup(field, seed), [field, seed])
  const reveal = useCupDrawReveal(field, result)
  const { advance } = reveal

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

  const download = (kind: 'txt' | 'csv') =>
    kind === 'csv'
      ? downloadText(`ffu-cup-draw-${seed}.csv`, formatDrawCsv(field, result, seed), 'text/csv')
      : downloadText(`ffu-cup-draw-${seed}.txt`, formatDrawSheet(field, result, seed), 'text/plain')

  return (
    <div className="space-y-5">
      <TopBar seed={seed} revealed={reveal.revealed} done={reveal.done} />

      {reveal.drawer && <DrawTieCard drawer={reveal.drawer} drawn={reveal.drawn} tieNumber={reveal.revealed + 1} />}

      {reveal.done && (
        <div className="border-2 bg-surface p-4 text-center" style={{ borderColor: CUP_ACCENT }}>
          <p className="text-lg font-extrabold uppercase tracking-tight">The draw is complete</p>
          <p className="mt-1 text-sm text-muted">
            Record the seed <span className="font-mono font-bold text-text">{seed}</span>, then run{' '}
            <code className="font-mono">npm run draw-cup -- --seed {seed}</code> to write the official bracket.
          </p>
        </div>
      )}

      <Controls done={reveal.done} spinning={reveal.spinning} onAdvance={advance} onDownload={download} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">The bowl</h2>
          <DrawBowl
            masters={reveal.mastersBowl}
            national={reveal.nationalBowl}
            spotlitId={reveal.spotlitId}
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
