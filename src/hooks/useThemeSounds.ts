import { useEffect } from 'react'
import { audioContext } from '@/lib/audioContext'
import type { ThemeId } from '@/themes/registry'

const PRESSABLE = 'a, button, select, summary, [role="button"], [role="tab"], [role="switch"]'
/** At most one scroll sound per this many ms: fast enough to follow the wheel, not a buzz. */
const SCROLL_EVERY_MS = 110

/**
 * A skin's interface sounds, when the visitor has turned them on: a press, a page change, and
 * scrolling. Delegated from the document, so no control anywhere has to know sounds exist.
 */
export function useThemeSounds(theme: ThemeId, enabled: boolean) {
  useEffect(() => {
    if (!enabled || theme === 'light' || theme === 'dark') return
    // Fetched as soon as sound is on, with the skin's recordings, so the first press already has them.
    const sounds = import('@/themes/themeSound')
    void sounds.then((m) => m.preload(theme))

    // `click`, not `pointerdown`: iOS does not count pointerdown as the user gesture that audio
    // needs, and the context has to be woken inside that gesture (see themeStore's unlockAudio).
    const onPress = (e: MouseEvent) => {
      const pressed = e.target instanceof Element ? e.target.closest(PRESSABLE) : null
      if (!pressed) return
      audioContext()
      // A link goes somewhere; everything else acts in place.
      const leaving = pressed instanceof HTMLAnchorElement && pressed.hasAttribute('href')
      void sounds.then((m) => (leaving ? m.playNav(theme) : m.playClick(theme)))
    }

    // Capture, because scroll does not bubble: this also hears the wide tables scrolling sideways.
    let lastAt = 0
    let lastY = window.scrollY
    const onScroll = () => {
      const now = performance.now()
      if (now - lastAt < SCROLL_EVERY_MS) return
      const y = window.scrollY
      const direction = y < lastY ? -1 : 1
      lastAt = now
      lastY = y
      void sounds.then((m) => m.playScroll(theme, direction))
    }

    document.addEventListener('click', onPress, true)
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      document.removeEventListener('click', onPress, true)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [theme, enabled])
}
