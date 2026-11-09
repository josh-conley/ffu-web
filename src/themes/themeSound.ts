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
  // A cheap sound card playing a fanfare: bare square waves, no decay to speak of.
  retro: {
    chime: [
      { type: 'square', hz: 392, at: 0, dur: 0.11, gain: 0.05 },
      { type: 'square', hz: 523.25, at: 0.12, dur: 0.11, gain: 0.05 },
      { type: 'square', hz: 659.25, at: 0.24, dur: 0.11, gain: 0.05 },
      { type: 'square', hz: 783.99, at: 0.36, dur: 0.3, gain: 0.05 },
    ],
    click: [{ type: 'square', hz: 440, at: 0, dur: 0.03, gain: 0.04 }],
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
  // Warm and woody: a low, unhurried three-note figure.
  thanksgiving: {
    chime: [
      { type: 'triangle', hz: 293.66, at: 0, dur: 0.5, gain: 0.16 },
      { type: 'triangle', hz: 369.99, at: 0.18, dur: 0.5, gain: 0.15 },
      { type: 'triangle', hz: 440, at: 0.36, dur: 0.8, gain: 0.15 },
    ],
    click: [{ type: 'triangle', hz: 320, toHz: 180, at: 0, dur: 0.06, gain: 0.14 }],
  },
  // Sleigh bells: high sines with a bright overtone and a long ring.
  christmas: {
    chime: [
      { type: 'sine', hz: 1318.5, at: 0, dur: 0.7, gain: 0.12 },
      { type: 'sine', hz: 2637, at: 0, dur: 0.3, gain: 0.04 },
      { type: 'sine', hz: 1568, at: 0.16, dur: 0.7, gain: 0.12 },
      { type: 'sine', hz: 3136, at: 0.16, dur: 0.3, gain: 0.04 },
      { type: 'sine', hz: 2093, at: 0.32, dur: 1.2, gain: 0.12 },
      { type: 'sine', hz: 4186, at: 0.32, dur: 0.4, gain: 0.04 },
    ],
    click: [{ type: 'sine', hz: 2637, at: 0, dur: 0.12, gain: 0.06 }],
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
