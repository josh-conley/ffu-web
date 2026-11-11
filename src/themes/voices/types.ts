// The vocabulary of the skins' sounds: notes for themeSound's little synth, and a few shapes that
// several skins share. Nothing in this folder is a recording or a transcription of a real
// product's sound; each voice is an original figure built to evoke its skin from oscillators and
// filtered noise.

export interface Note {
  /** An oscillator shape, or band-passed white noise (drums, shakers, wind, paper). */
  type: OscillatorType | 'noise'
  /** Pitch; for noise, the centre of the band. */
  hz: number
  /** Glide to this over the note: a pitch sweep, or for noise a whoosh as the band moves. */
  toHz?: number
  /** Start, in seconds after the sound begins. */
  at: number
  dur: number
  gain: number
  /** Seconds to reach full volume. Default is a near-instant 8ms; longer makes a swell. */
  attack?: number
  /** Noise only: how narrow the band is. Higher is more pitched, more metallic. */
  q?: number
  /** Oscillators only: a wobble in pitch (`depth` in Hz, `hz` times a second). Voices, theremins. */
  vibrato?: { hz: number; depth: number }
}

export interface Voice {
  /** Switching to the skin: the big one. */
  chime: Note[]
  /** Following a link to another page. */
  nav: Note[]
  /** Pressing a button, tab or select. Several takes, played in rotation so it never drones. */
  click: Note[][]
  /**
   * While scrolling, one per tick. Stepped through in order going down and backwards going up, so
   * a voice can make it a scale that follows the page, or just vary the texture.
   */
  scroll: Note[][]
}

export const steps = (count: number, make: (i: number) => Note[]): Note[] =>
  Array.from({ length: count }, (_, i) => make(i)).flat()

/** The same notes, starting `delay` seconds later. */
export const later = (notes: Note[], delay: number): Note[] => notes.map((n) => ({ ...n, at: n.at + delay }))

/** A bell: the note plus a quieter octave above, which is what makes a sine read as struck metal. */
export const bell = (hz: number, at: number, dur: number, gain: number): Note[] => [
  { type: 'sine', hz, at, dur, gain },
  { type: 'sine', hz: hz * 2, at, dur: dur * 0.4, gain: gain * 0.35 },
]
