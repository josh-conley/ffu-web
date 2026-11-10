import { THEMES } from './registry'
import { VOICES } from './themeVoices'

describe('theme voices', () => {
  it('gives every skin a chime and a click, and the standard look neither', () => {
    for (const t of THEMES) {
      const skin = t.id !== 'light' && t.id !== 'dark'
      expect(VOICES[t.id] !== undefined, t.id).toBe(skin)
    }
  })

  it('keeps every note playable: audible, positive length, a real pitch', () => {
    // exponentialRamp throws on zero or negative values, which would silence the whole sound.
    for (const voice of Object.values(VOICES)) {
      for (const note of [...voice.chime, ...voice.click]) {
        expect(note.gain).toBeGreaterThan(0)
        expect(note.gain).toBeLessThanOrEqual(0.3)
        expect(note.dur).toBeGreaterThan(note.attack ?? 0.008)
        expect(note.hz).toBeGreaterThan(0)
        expect(note.toHz ?? 1).toBeGreaterThan(0)
        expect(note.at).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('keeps a click short, since it plays on every press', () => {
    for (const voice of Object.values(VOICES)) {
      for (const note of voice.click) expect(note.at + note.dur).toBeLessThanOrEqual(0.15)
    }
  })
})
