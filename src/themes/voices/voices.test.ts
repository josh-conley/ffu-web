import { THEMES } from '../registry'
import { VOICES } from './index'
import type { Note, Voice } from './types'

const sounds = (voice: Voice): Note[][] => [voice.chime, voice.nav, ...voice.click, ...voice.scroll]
const length = (notes: Note[]) => Math.max(...notes.map((n) => n.at + n.dur))

describe('theme voices', () => {
  it('gives every skin a voice, and the standard look none', () => {
    for (const t of THEMES) {
      const skin = t.id !== 'light' && t.id !== 'dark'
      expect(VOICES[t.id] !== undefined, t.id).toBe(skin)
    }
  })

  it('gives every voice all four kinds of sound, with variety in the repeated ones', () => {
    for (const [id, voice] of Object.entries(VOICES)) {
      expect(voice.chime.length, id).toBeGreaterThan(0)
      expect(voice.nav.length, id).toBeGreaterThan(0)
      expect(voice.click.length, id).toBeGreaterThanOrEqual(3)
      expect(voice.scroll.length, id).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps every note playable: audible, positive length, a real pitch', () => {
    // exponentialRamp throws on zero or negative values, which would silence the whole sound.
    for (const voice of Object.values(VOICES)) {
      for (const note of sounds(voice).flat()) {
        expect(note.gain).toBeGreaterThan(0)
        expect(note.gain).toBeLessThanOrEqual(0.35)
        expect(note.dur).toBeGreaterThan(note.attack ?? 0.008)
        expect(note.hz).toBeGreaterThan(0)
        expect(note.toHz ?? 1).toBeGreaterThan(0)
        expect(note.at).toBeGreaterThanOrEqual(0)
        // A wobble wider than the pitch would swing the frequency negative.
        expect(note.vibrato?.depth ?? 0).toBeLessThan(Math.min(note.hz, note.toHz ?? note.hz))
      }
    }
  })

  it('sizes each sound to how often it plays', () => {
    for (const [id, voice] of Object.entries(VOICES)) {
      for (const take of voice.scroll) expect(length(take), `${id} scroll`).toBeLessThanOrEqual(0.12)
      for (const take of voice.click) expect(length(take), `${id} click`).toBeLessThanOrEqual(0.6)
      expect(length(voice.nav), `${id} nav`).toBeLessThanOrEqual(1.2)
    }
  })
})
