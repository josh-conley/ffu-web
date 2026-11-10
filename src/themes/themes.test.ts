import html from '../../index.html?raw'
import { THEMES } from './registry'
import { getThemeState, setTheme, setThemeSound, subscribeTheme, withStandardLook } from './themeStore'

const root = document.documentElement

describe('theme registry', () => {
  it('lists every dark theme in the pre-paint script, so a reload paints in the right mode', () => {
    // index.html cannot import the registry (it runs before any module), so it carries its own
    // list of the dark ids. This is what keeps the two from drifting.
    const listed = /const DARK = \[([^\]]*)\]/.exec(html)?.[1]?.match(/[\w-]+/g) ?? []
    expect([...listed].sort()).toEqual(THEMES.filter((t) => t.dark).map((t) => t.id).sort())
  })

  it('gives every skin a stylesheet to load, and the standard look none', () => {
    for (const t of THEMES) {
      expect(typeof t.load === 'function').toBe(t.id !== 'light' && t.id !== 'dark')
    }
  })
})

describe('theme store', () => {
  // Start from a known theme: during a holiday week the store would otherwise open on that skin.
  beforeEach(() => setTheme('light'))
  afterEach(async () => {
    await setTheme('light')
    setThemeSound(false)
  })

  it('applies a skin as data-theme on top of its mode, and remembers it', async () => {
    await setTheme('arcade')
    expect(root.dataset.theme).toBe('arcade')
    expect(root).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('arcade')

    await setTheme('xp')
    expect(root.dataset.theme).toBe('xp')
    expect(root).not.toHaveClass('dark')
  })

  it('clears the skin when going back to the standard look', async () => {
    await setTheme('xp')
    await setTheme('dark')
    expect(root.dataset.theme).toBeUndefined()
    expect(root).toHaveClass('dark')
    expect(getThemeState().theme).toBe('dark')
  })

  it('tells subscribers about a change', async () => {
    const seen: string[] = []
    const stop = subscribeTheme(() => seen.push(getThemeState().theme))
    await setTheme('xp')
    stop()
    await setTheme('dark')
    expect(seen).toEqual(['xp'])
  })

  it('remembers the pick under its own key', async () => {
    await setTheme('xp')
    expect(localStorage.getItem('theme')).toBe('xp')
    expect(localStorage.getItem('theme-holiday')).toBeNull()
  })

  it('keeps sound off until asked', () => {
    expect(getThemeState().sound).toBe(false)
    setThemeSound(true)
    expect(getThemeState().sound).toBe(true)
    expect(localStorage.getItem('theme-sound')).toBe('1')
  })

  it('drops the skin for the length of a capture, then puts it back', async () => {
    await setTheme('arcade')
    const during = await withStandardLook(() => Promise.resolve(root.dataset.theme))
    expect(during).toBeUndefined()
    expect(root.dataset.theme).toBe('arcade')
    // The mode is untouched: a dark skin captures as standard dark.
    expect(root).toHaveClass('dark')
  })

  it('restores the skin even when the capture fails', async () => {
    await setTheme('xp')
    await expect(withStandardLook(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(root.dataset.theme).toBe('xp')
  })
})

describe('holiday default', () => {
  const load = () => import('./themeStore')

  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
    root.classList.remove('dark')
    delete root.dataset.theme
  })

  it('wears the holiday skin for its week without touching the saved choice', async () => {
    vi.setSystemTime(new Date(2026, 10, 26, 12))
    localStorage.setItem('theme', 'dark')
    const store = await load()
    expect(store.getThemeState().theme).toBe('thanksgiving')
    expect(root.dataset.theme).toBe('thanksgiving')
    expect(root).not.toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    // The hint the pre-paint script reads on the next load.
    expect(localStorage.getItem('theme-holiday')).toBe('thanksgiving')
  })

  it('goes back to the saved choice once the week is over', async () => {
    vi.setSystemTime(new Date(2026, 11, 2, 9))
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('theme-holiday', 'thanksgiving')
    const store = await load()
    expect(store.getThemeState().theme).toBe('dark')
    expect(root.dataset.theme).toBeUndefined()
    expect(localStorage.getItem('theme-holiday')).toBeNull()
  })

  it('lets a pick made during the week stand for the rest of it', async () => {
    vi.setSystemTime(new Date(2026, 11, 24, 12))
    const first = await load()
    expect(first.getThemeState().theme).toBe('christmas')
    await first.setTheme('light')

    vi.resetModules()
    const second = await load()
    expect(second.getThemeState().theme).toBe('light')
  })

  it('offers the skin again the next year', async () => {
    localStorage.setItem('theme', 'light')
    localStorage.setItem('theme-holiday-declined', 'christmas-2026')
    vi.setSystemTime(new Date(2027, 11, 25, 12))
    const store = await load()
    expect(store.getThemeState().theme).toBe('christmas')
  })
})
