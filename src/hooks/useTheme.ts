import { useSyncExternalStore } from 'react'
import { getThemeState, setTheme, setThemeSound, subscribeTheme } from '@/themes/themeStore'
import type { ThemeId } from '@/themes/registry'

/** The document's theme and sound preference (see themes/themeStore), shared by every caller. */
export function useTheme(): {
  theme: ThemeId
  sound: boolean
  setTheme: (id: ThemeId) => void
  setSound: (on: boolean) => void
} {
  const { theme, sound } = useSyncExternalStore(subscribeTheme, getThemeState)
  return { theme, sound, setTheme: (id) => void setTheme(id), setSound: setThemeSound }
}
