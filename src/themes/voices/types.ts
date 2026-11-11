// The vocabulary of the skins' sounds. A sound is either a recording (a public-domain or
// Creative Commons clip under public/sounds, credited in CREDITS.md there) or, where no good
// recording was found, notes for themeSound's little synth. Nothing is taken from the products
// the skins nod to.

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

/** A recording: a file under `public/sounds/` (see CREDITS.md there for where each came from). */
export interface Clip {
  clip: string
  /** Volume relative to the file, which is already normalised. */
  gain: number
}

/** One sound: either notes for the synth, or a recording. */
export type Sound = Note[] | Clip

export const isClip = (sound: Sound): sound is Clip => !Array.isArray(sound)
export const clip = (path: string, gain = 1): Clip => ({ clip: `${path}.mp3`, gain })
/** `count` numbered takes of one recording: `skin/name-1.mp3`, `skin/name-2.mp3`, ... */
export const takes = (path: string, count: number, gain = 1): Clip[] =>
  Array.from({ length: count }, (_, i) => clip(`${path}-${i + 1}`, gain))

export interface Voice {
  /** Switching to the skin: the big one. */
  chime: Sound
  /** Following a link to another page. */
  nav: Sound
  /** Pressing a button, tab or select. Several takes, played in rotation so it never drones. */
  click: Sound[]
  /**
   * While scrolling, one per tick. Stepped through in order going down and backwards going up, so
   * a voice can make it a scale that follows the page, or just vary the texture.
   */
  scroll: Sound[]
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
