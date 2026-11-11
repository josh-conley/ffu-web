import { useTheme } from '@/hooks/useTheme'
import { useThemeSounds } from '@/hooks/useThemeSounds'

/**
 * The page-wide side of a skin that CSS alone can't reach: the overlay element its stylesheet
 * paints effects on (`.theme-fx` in index.css, hidden in the standard look), and its opt-in
 * interface sounds.
 */
export function ThemeEffects() {
  const { theme, sound } = useTheme()
  useThemeSounds(theme, sound)
  return <div aria-hidden className="theme-fx" />
}
