import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="ml-1 rounded-md p-2 text-muted hover:bg-surface-2 hover:text-text"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
