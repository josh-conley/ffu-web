import { THEMES } from '../registry'
import { VOICES } from './index'
import { isClip, type Note, type Sound, type Voice } from './types'

const sounds = (voice: Voice): Sound[] => [voice.chime, voice.nav, ...voice.click, ...voice.scroll]
const synth = (list: Sound[]): Note[][] => list.filter((s): s is Note[] => !isClip(s))
const length = (notes: Note[]) => Math.max(...notes.map((n) => n.at + n.dur))

/** Every recording on disk, as the path a voice would name it by. */
const FILES = Object.keys(import.meta.glob('../../../public/sounds/**/*.mp3')).map((p) => p.split('/public/sounds/')[1])

describe('theme voices', () => {
  it('gives every skin a voice, and the standard look none', () => {
    for (const t of THEMES) {
      const skin = t.id !== 'light' && t.id !== 'dark'
      expect(VOICES[t.id] !== undefined, t.id).toBe(skin)
    }
  })

  it('gives every voice variety in the sounds that repeat', () => {
    for (const [id, voice] of Object.entries(VOICES)) {
      expect(voice.click.length, id).toBeGreaterThanOrEqual(3)
      expect(voice.scroll.length, id).toBeGreaterThanOrEqual(3)
    }
  })

  it('only names recordings that exist', () => {
    for (const voice of Object.values(VOICES)) {
      for (const sound of sounds(voice)) if (isClip(sound)) expect(FILES).toContain(sound.clip)
    }
  })

  it('ships no recording that nothing plays', () => {
    const used = Object.values(VOICES).flatMap((v) => sounds(v).filter(isClip).map((c) => c.clip))
    expect([...FILES].sort()).toEqual([...new Set(used)].sort())
  })

  it('keeps every synth note playable: audible, positive length, a real pitch', () => {
    // exponentialRamp throws on zero or negative values, which would silence the whole sound.
    for (const voice of Object.values(VOICES)) {
      for (const note of synth(sounds(voice)).flat()) {
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

  it('keeps synth scroll ticks short, since they play many times a second', () => {
    for (const [id, voice] of Object.entries(VOICES)) {
      for (const take of synth(voice.scroll)) expect(length(take), id).toBeLessThanOrEqual(0.12)
    }
  })
})
