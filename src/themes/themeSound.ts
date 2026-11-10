import { audioContext, noiseBuffer } from '@/lib/audioContext'
import type { ThemeId } from './registry'
import { VOICES, type Note } from './themeVoices'

// Opt-in UI sounds for the skins, synthesised with Web Audio: no asset files to host. This is the
// player; what each skin sounds like is data in themeVoices. Loaded on demand, only once a visitor
// turns sound on.

/** The sound source for one note: an oscillator, or looped noise through a band-pass. */
function source(audio: AudioContext, note: Note, start: number): { node: AudioNode; src: AudioScheduledSourceNode } {
  if (note.type === 'noise') {
    const src = audio.createBufferSource()
    src.buffer = noiseBuffer(audio)
    src.loop = true
    const band = audio.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.setValueAtTime(note.hz, start)
    band.Q.setValueAtTime(note.q ?? 1, start)
    src.connect(band)
    return { node: band, src }
  }
  const osc = audio.createOscillator()
  osc.type = note.type
  osc.frequency.setValueAtTime(note.hz, start)
  if (note.toHz !== undefined) osc.frequency.exponentialRampToValueAtTime(note.toHz, start + note.dur)
  return { node: osc, src: osc }
}

function play(notes: Note[]) {
  const audio = audioContext()
  if (!audio) return
  const now = audio.currentTime
  for (const note of notes) {
    const start = now + note.at
    const { node, src } = source(audio, note, start)

    // A short attack so a note doesn't open with a click (longer for a swell), then a natural decay.
    const vol = audio.createGain()
    vol.gain.setValueAtTime(0.0001, start)
    vol.gain.exponentialRampToValueAtTime(note.gain, start + (note.attack ?? 0.008))
    vol.gain.exponentialRampToValueAtTime(0.0001, start + note.dur)

    node.connect(vol).connect(audio.destination)
    src.start(start)
    src.stop(start + note.dur + 0.02)
  }
}

export function playChime(theme: ThemeId) {
  const voice = VOICES[theme]
  if (voice) play(voice.chime)
}

export function playClick(theme: ThemeId) {
  const voice = VOICES[theme]
  if (voice) play(voice.click)
}
