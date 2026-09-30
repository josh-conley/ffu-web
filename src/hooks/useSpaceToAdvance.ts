import { useEffect } from 'react'

/**
 * Space (or Enter) drives the live draw, whatever has focus.
 *
 * Two ways a press used to go wrong on camera: space landed on whichever button last had focus
 * (after clicking CSV, the next press downloaded the whole answer sheet), and a held key
 * auto-repeated through Draw → Reveal → Next. So: a focused button is blurred and the press still
 * advances the draw, and repeats are ignored. Enter on a button keeps its normal meaning, so the
 * page stays usable from the keyboard; only the text input is left alone entirely.
 */
export function useSpaceToAdvance(advance: () => void): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space' && e.code !== 'Enter') return
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (el instanceof HTMLButtonElement) {
        if (e.code === 'Enter') return
        // Blur on keydown, so the keyup that would "click" it lands on the body instead.
        el.blur()
      }
      e.preventDefault()
      if (!e.repeat) advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance])
}
