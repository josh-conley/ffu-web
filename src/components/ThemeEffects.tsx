import { useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'

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
    const onPress = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(PRESSABLE)) return
      void import('@/themes/themeSound').then((m) => m.playClick(theme))
    }
    document.addEventListener('pointerdown', onPress)
    return () => document.removeEventListener('pointerdown', onPress)
  }, [theme, sound])

  return <div aria-hidden className="theme-fx" />
}
