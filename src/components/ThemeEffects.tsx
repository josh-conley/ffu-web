import { useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { audioContext } from '@/lib/audioContext'

const PRESSABLE = 'a, button, select, summary, [role="button"], [role="tab"]'

/**
 * The page-wide side of a skin that CSS alone can't reach: the overlay element its stylesheet
 * paints effects on (`.theme-fx` in index.css, hidden in the standard look), and the opt-in click
 * sound. One delegated listener, so no control anywhere has to know sounds exist.
 */
export function ThemeEffects() {
  const { theme, sound } = useTheme()

  useEffect(() => {
    if (!sound || theme === 'light' || theme === 'dark') return
    // Fetched as soon as sound is on, so the first press already has it.
    const voices = import('@/themes/themeSound')
    // `click`, not `pointerdown`: iOS does not count pointerdown as the user gesture that audio
    // needs, and the context has to be woken inside that gesture (see themeStore's unlockAudio).
    const onPress = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(PRESSABLE)) return
      audioContext()
      void voices.then((m) => m.playClick(theme))
    }
    document.addEventListener('click', onPress, true)
    return () => document.removeEventListener('click', onPress, true)
  }, [theme, sound])

  return <div aria-hidden className="theme-fx" />
}
