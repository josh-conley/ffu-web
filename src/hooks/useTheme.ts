import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

// The initial `.dark` class is set by an inline script in index.html (pre-paint, no flash);
// this hook reads that state and keeps it in sync with toggles + localStorage.
function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggle }
}
