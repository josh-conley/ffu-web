import { useState, type MouseEvent } from 'react'
import { FaVolumeHigh, FaVolumeXmark } from 'react-icons/fa6'
import { CUP_ACCENT } from '@/config'
import { BUTTON } from '../../controls'

// The operator's controls, in the top bar. They sit ABOVE the card, not below it: things below the
// card come and go between phases, and the main button used to jump ~70px every press as they did.
//
// Every button blurs itself after a click. The space bar drives the draw, and a button that kept
// focus would otherwise swallow the next press.

const blurAfter = (fn: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.blur()
  fn()
}

export function DrawControls({ done, label, onAdvance }: {
  done: boolean
  /** Reads what the next press will do: draw, cut the spin short, or move on. */
  label: string
  onAdvance: () => void
}) {
  if (done) return null
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={blurAfter(onAdvance)}
        className="min-h-10 min-w-36 border px-5 py-1.5 text-base font-extrabold uppercase tracking-wide text-white"
        style={{ backgroundColor: CUP_ACCENT, borderColor: CUP_ACCENT }}
      >
        {label}
      </button>
      <span className="text-xs uppercase tracking-widest text-muted">or press space</span>
    </div>
  )
}

export function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={blurAfter(onToggle)}
      aria-pressed={muted}
      aria-label={muted ? 'Unmute the wheel' : 'Mute the wheel'}
      className={BUTTON}
    >
      {muted ? <FaVolumeXmark aria-hidden /> : <FaVolumeHigh aria-hidden />}
    </button>
  )
}

/**
 * "Start over" asks first once anything has been drawn: one stray click on camera used to throw
 * the whole draw away. Inline rather than a browser dialog, which would freeze the stream capture.
 */
export function RestartButton({ drawnAny, onRestart }: { drawnAny: boolean; onRestart: () => void }) {
  const [asking, setAsking] = useState(false)
  const link = 'text-xs uppercase tracking-widest text-muted hover:text-accent'

  if (!asking) {
    return (
      <button type="button" className={link} onClick={blurAfter(() => (drawnAny ? setAsking(true) : onRestart()))}>
        ← Start over with a different seed
      </button>
    )
  }
  return (
    <p className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest">
      <span className="font-bold text-negative">Throw this draw away?</span>
      <button type="button" className={`${link} font-bold`} onClick={blurAfter(onRestart)}>
        Yes, start over
      </button>
      <button type="button" className={link} onClick={blurAfter(() => setAsking(false))}>
        Keep drawing
      </button>
    </p>
  )
}
