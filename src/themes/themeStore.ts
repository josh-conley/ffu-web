import { audioContext } from '@/lib/audioContext'
import { isThemeId, themeDef, type ThemeId } from './registry'
import { holidayWeek } from './seasonal'

// One theme for the whole document, so it lives in a module-level store rather than component
// state: the picker is mounted twice (desktop bar + mobile bar) and both must agree.
//
// What shows is, in order: this week's holiday skin (see seasonal.ts) unless the visitor has picked
// something else during that week; else the visitor's saved choice; else the OS light/dark setting.
// A holiday default never overwrites the saved choice, so the visitor gets their own theme back
// when the week ends.

/** The visitor's own pick. */
const THEME_KEY = 'theme'
/** The holiday skin currently shown by default. A hint for index.html's pre-paint script only. */
const HOLIDAY_KEY = 'theme-holiday'
/** The holiday week (seasonal.ts `key`) in which the visitor picked a theme themselves. */
const DECLINED_KEY = 'theme-holiday-declined'
const SOUND_KEY = 'theme-sound'

interface ThemeState {
  theme: ThemeId
  /** Opt-in UI sounds for skins. Off unless the visitor turns it on. */
  sound: boolean
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function startingTheme(): { theme: ThemeId; holiday: boolean } {
  const week = holidayWeek(new Date())
  if (week && read(DECLINED_KEY) !== week.key) return { theme: week.id, holiday: true }
  const saved = read(THEME_KEY)
  if (isThemeId(saved)) return { theme: saved, holiday: false }
  const osDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  return { theme: osDark ? 'dark' : 'light', holiday: false }
}

function persist(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private mode): the choice still holds for this page view.
  }
}

const starting = startingTheme()
let state: ThemeState = { theme: starting.theme, sound: read(SOUND_KEY) === '1' }
const listeners = new Set<() => void>()

function update(next: Partial<ThemeState>) {
  state = { ...state, ...next }
  listeners.forEach((notify) => notify())
}

export const getThemeState = (): ThemeState => state

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function applyToDocument(id: ThemeId) {
  const root = document.documentElement
  root.classList.toggle('dark', themeDef(id).dark)
  if (id === 'light' || id === 'dark') delete root.dataset.theme
  else root.dataset.theme = id
}

// The pre-paint script only knows the last theme it was told about. Bring the document in line
// with what this visit actually resolves to (a holiday week starting or ending changes it), and
// leave the script its hint for next time.
applyToDocument(starting.theme)
persist(HOLIDAY_KEY, starting.holiday ? starting.theme : null)

/**
 * The visitor picks a theme. A skin's stylesheet is fetched BEFORE the switch so the page never shows the
 * half-state of new attribute, old styles. If the fetch fails (offline), the current theme stays.
 */
export async function setTheme(id: ThemeId): Promise<void> {
  if (state.sound) unlockAudio()
  try {
    await themeDef(id).load?.()
  } catch {
    return
  }
  applyToDocument(id)
  persist(THEME_KEY, id)
  // Their own pick now stands for the rest of any holiday week in progress.
  persist(HOLIDAY_KEY, null)
  const week = holidayWeek(new Date())
  if (week) persist(DECLINED_KEY, week.key)
  update({ theme: id })
  if (state.sound) void import('./themeSound').then((m) => m.playChime(id))
}

/**
 * Phones (iOS above all) only let audio start from INSIDE a tap's own event handler. The sounds
 * themselves play a moment later, after a stylesheet or the sound module has loaded, which is too
 * late to count. So every tap that will lead to a sound wakes the audio context synchronously
 * first; once it is running, the later play goes through.
 */
function unlockAudio() {
  audioContext()
}

export function setThemeSound(on: boolean) {
  if (on) unlockAudio()
  persist(SOUND_KEY, on ? '1' : '0')
  update({ sound: on })
  // The toggle itself is the audible confirmation that sound is on.
  if (on) void import('./themeSound').then((m) => m.playChime(state.theme))
}

/**
 * Resolves once the saved theme's stylesheet is in, so the first render is already themed. Never
 * rejects: a skin that can't load falls back to the standard look in its mode.
 */
export async function themeReady(): Promise<void> {
  try {
    await themeDef(state.theme).load?.()
  } catch {
    const fallback: ThemeId = themeDef(state.theme).dark ? 'dark' : 'light'
    applyToDocument(fallback)
    update({ theme: fallback })
  }
}

/**
 * Runs `task` with the skin switched off (standard look, same light/dark mode), then restores it.
 * For captures that leave the site (the newsletter panel image), which should not carry whatever
 * novelty skin the author happens to be browsing with.
 */
export async function withStandardLook<T>(task: () => Promise<T>): Promise<T> {
  const root = document.documentElement
  const skin = root.dataset.theme
  if (skin === undefined) return task()
  delete root.dataset.theme
  try {
    return await task()
  } finally {
    root.dataset.theme = skin
  }
}
