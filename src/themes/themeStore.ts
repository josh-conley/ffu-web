import { audioContext } from '@/lib/audioContext'
import { isThemeId, themeDef, type ThemeId } from './registry'

// One theme for the whole document, so it lives in a module-level store rather than component
// state: the picker is mounted twice (desktop bar + mobile bar) and both must agree.
//
// The DOM is the source of truth. The inline script in index.html sets `.dark` / `data-theme` before
// first paint from the same localStorage key; this store reads that back and keeps it in sync.

const THEME_KEY = 'theme'
const SOUND_KEY = 'theme-sound'

interface ThemeState {
  theme: ThemeId
  /** Opt-in UI sounds for skins. Off unless the visitor turns it on. */
  sound: boolean
}

function readTheme(): ThemeId {
  const root = document.documentElement
  const skin = root.dataset.theme
  if (isThemeId(skin)) return skin
  return root.classList.contains('dark') ? 'dark' : 'light'
}

function readSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === '1'
  } catch {
    return false
  }
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private mode): the choice still holds for this page view.
  }
}

let state: ThemeState = { theme: readTheme(), sound: readSound() }
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

/**
 * Switch theme. A skin's stylesheet is fetched BEFORE the switch so the page never shows the
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
