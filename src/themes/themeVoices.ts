import type { ThemeId } from './registry'

// What each skin sounds like, as data for themeSound's little synth. Nothing here is a recording
// or a transcription of a real product's sound: each is an original figure built to evoke the
// skin (a desktop booting, a turkey, sleigh bells), from oscillators and filtered noise.

export interface Note {
  /** An oscillator shape, or band-passed white noise (drums, shakers, crunches). */
  type: OscillatorType | 'noise'
  /** Pitch; for noise, the centre of the band. */
  hz: number
  /** Glide to this pitch over the note, for sweeps and drops. */
  toHz?: number
  /** Start, in seconds after the sound begins. */
  at: number
  dur: number
  gain: number
  /** Seconds to reach full volume. Default is a near-instant 8ms; longer makes a swell. */
  attack?: number
  /** Noise only: how narrow the band is. Higher is more pitched, more metallic. */
  q?: number
}

export interface Voice {
  /** Played when the theme is switched to. */
  chime: Note[]
  /** Played on a press of any button, link or select. */
  click: Note[]
}

const steps = (count: number, make: (i: number) => Note[]): Note[] => Array.from({ length: count }, (_, i) => make(i)).flat()

/** A bell: the note plus a quieter octave above, which is what makes a sine read as struck metal. */
const bell = (hz: number, at: number, dur: number, gain: number): Note[] => [
  { type: 'sine', hz, at, dur, gain },
  { type: 'sine', hz: hz * 2, at, dur: dur * 0.4, gain: gain * 0.35 },
]

/** One shake of sleigh bells: a hiss of very high noise with two metallic partials in it. */
const jingle = (at: number, gain: number): Note[] => [
  { type: 'noise', hz: 7000, q: 3, at, dur: 0.09, gain },
  { type: 'sine', hz: 5200, at, dur: 0.08, gain: gain * 0.15 },
  { type: 'sine', hz: 6400, at, dur: 0.08, gain: gain * 0.15 },
]

// A desktop finishing booting: a soft major pad swells in while a glassy four-note figure settles
// on top. The click is the dry tick of a folder opening.
const xp: Voice = {
  chime: [
    ...[311.13, 466.16, 622.25].map((hz): Note => ({ type: 'sine', hz, at: 0, dur: 1.9, gain: 0.07, attack: 0.3 })),
    { type: 'triangle', hz: 932.33, at: 0.1, dur: 0.5, gain: 0.1 },
    { type: 'triangle', hz: 783.99, at: 0.45, dur: 0.5, gain: 0.1 },
    { type: 'triangle', hz: 622.25, at: 0.8, dur: 0.5, gain: 0.1 },
    { type: 'triangle', hz: 1244.5, at: 1.15, dur: 1, gain: 0.1 },
  ],
  click: [
    { type: 'noise', hz: 3000, q: 2, at: 0, dur: 0.02, gain: 0.25 },
    { type: 'sine', hz: 1200, at: 0, dur: 0.015, gain: 0.05 },
  ],
}

// A 90s TV sting: two orchestra hits (stacked saws) with a snare on the second, then a slap-bass
// lick. The click is a bubble pop.
const ORCH = [130.81, 261.63, 392, 523.25, 783.99]
const retro: Voice = {
  chime: [
    ...ORCH.map((hz): Note => ({ type: 'sawtooth', hz, at: 0, dur: 0.28, gain: 0.05 })),
    ...ORCH.map((hz): Note => ({ type: 'sawtooth', hz, at: 0.32, dur: 0.13, gain: 0.05 })),
    { type: 'noise', hz: 1800, q: 0.8, at: 0.32, dur: 0.12, gain: 0.2 },
    { type: 'square', hz: 98, at: 0.5, dur: 0.12, gain: 0.09 },
    { type: 'square', hz: 130.81, at: 0.66, dur: 0.12, gain: 0.09 },
    { type: 'square', hz: 146.83, at: 0.82, dur: 0.1, gain: 0.09 },
    { type: 'square', hz: 130.81, at: 0.98, dur: 0.3, gain: 0.09 },
    { type: 'noise', hz: 1800, q: 0.8, at: 0.98, dur: 0.12, gain: 0.2 },
  ],
  click: [{ type: 'sine', hz: 300, toHz: 900, at: 0, dur: 0.06, gain: 0.15 }],
}

// A cabinet taking a coin: the two-note coin blip, then a rising square-wave power-up run that
// lands on a held note. Bare square waves throughout, like the sound chips of the day. The click
// is a laser.
const POWER_UP = [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5]
const arcade: Voice = {
  chime: [
    { type: 'square', hz: 987.77, at: 0, dur: 0.08, gain: 0.05 },
    { type: 'square', hz: 1318.5, at: 0.08, dur: 0.35, gain: 0.05 },
    ...POWER_UP.map((hz, i): Note => ({ type: 'square', hz, at: 0.5 + i * 0.07, dur: 0.08, gain: 0.05 })),
    { type: 'square', hz: 1046.5, at: 0.99, dur: 0.5, gain: 0.05 },
    { type: 'triangle', hz: 130.81, at: 0.5, dur: 0.95, gain: 0.12 },
  ],
  click: [{ type: 'sawtooth', hz: 1800, toHz: 180, at: 0, dur: 0.09, gain: 0.05 }],
}

// A turkey: two gobbles, each a run of quick falling blips that wobble up and down as they
// descend. The click is a dry leaf underfoot.
const gobble = (start: number, count: number): Note[] =>
  steps(count, (i) => {
    const hz = 620 - i * 28 + (i % 2 ? 70 : 0)
    return [{ type: 'sawtooth', hz, toHz: hz * 0.78, at: start + i * 0.055, dur: 0.05, gain: 0.07 }]
  })
const thanksgiving: Voice = {
  chime: [...gobble(0, 10), ...gobble(0.75, 7)],
  click: [
    { type: 'noise', hz: 2500, q: 1, at: 0, dur: 0.05, gain: 0.2 },
    { type: 'noise', hz: 900, q: 1, at: 0.02, dur: 0.04, gain: 0.15 },
  ],
}

// Sleigh bells shaken in time under three rising bell notes. The click is one shake.
const christmas: Voice = {
  chime: [
    ...steps(6, (i) => jingle(i * 0.15, 0.14)),
    ...bell(1318.5, 0, 0.8, 0.09),
    ...bell(1568, 0.3, 0.8, 0.09),
    ...bell(2093, 0.6, 1.3, 0.09),
  ],
  click: jingle(0, 0.12),
}

export const VOICES: Partial<Record<ThemeId, Voice>> = { xp, retro, arcade, thanksgiving, christmas }
