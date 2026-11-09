import { audioContext } from '@/lib/audioContext'
import type { ThemeId } from './registry'

// Opt-in UI sounds for the skins, synthesised with Web Audio (no asset files, and nothing lifted
// from the real products the skins nod to). Loaded on demand, only once a visitor turns sound on.

interface Note {
  type: OscillatorType
  hz: number
  /** Glide to this pitch over the note, for sweeps. */
  toHz?: number
  /** Start, in seconds after the sound begins. */
  at: number
  dur: number
  gain: number
}

interface Voice {
  /** Played when the theme is switched to. */
  chime: Note[]
  /** Played on a press of any button, link or select. */
  click: Note[]
}

const VOICES: Partial<Record<ThemeId, Voice>> = {
  // Soft, rounded and major: a desktop saying hello.
  xp: {
    chime: [
      { type: 'sine', hz: 523.25, at: 0, dur: 0.5, gain: 0.16 },
      { type: 'sine', hz: 783.99, at: 0.14, dur: 0.5, gain: 0.14 },
      { type: 'triangle', hz: 659.25, at: 0.3, dur: 0.6, gain: 0.14 },
      { type: 'sine', hz: 1046.5, at: 0.48, dur: 0.9, gain: 0.12 },
    ],
    click: [{ type: 'sine', hz: 900, toHz: 500, at: 0, dur: 0.05, gain: 0.12 }],
  },
  // Harsh and synthetic: a rising saw sweep with a detuned shadow, and a terminal blip.
  cyberpunk: {
    chime: [
      { type: 'sawtooth', hz: 110, toHz: 880, at: 0, dur: 0.35, gain: 0.07 },
      { type: 'sawtooth', hz: 112, toHz: 892, at: 0, dur: 0.35, gain: 0.07 },
      { type: 'square', hz: 1760, at: 0.36, dur: 0.08, gain: 0.05 },
      { type: 'square', hz: 1320, at: 0.46, dur: 0.16, gain: 0.05 },
    ],
    click: [{ type: 'square', hz: 1400, toHz: 2100, at: 0, dur: 0.035, gain: 0.04 }],
  },
}

function play(notes: Note[]) {
  const audio = audioContext()
  if (!audio) return
  const now = audio.currentTime
  for (const note of notes) {
    const start = now + note.at
    const osc = audio.createOscillator()
    osc.type = note.type
    osc.frequency.setValueAtTime(note.hz, start)
    if (note.toHz !== undefined) osc.frequency.exponentialRampToValueAtTime(note.toHz, start + note.dur)

    // A few ms of attack so a note doesn't open with a click, then a natural decay.
    const vol = audio.createGain()
    vol.gain.setValueAtTime(0.0001, start)
    vol.gain.exponentialRampToValueAtTime(note.gain, start + 0.008)
    vol.gain.exponentialRampToValueAtTime(0.0001, start + note.dur)

    osc.connect(vol).connect(audio.destination)
    osc.start(start)
    osc.stop(start + note.dur + 0.02)
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
