import { clip, takes, type Note, type Voice } from './types'

// A haunted house. Wind, a low organ chord and a wavering theremin to open; then on every press
// a knock at the door, a ghost, or a creaking hinge; a wolf howling when you change page; and
// bat wings and rattling chains as you scroll.

export const halloween: Voice = {
  chime: [
    { type: 'noise', hz: 500, q: 0.8, at: 0, dur: 2, gain: 0.14, attack: 0.7 },
    ...[73.42, 87.31, 110].map((hz): Note => ({ type: 'square', hz, at: 0.2, dur: 1.8, gain: 0.03, attack: 0.4 })),
    { type: 'sine', hz: 587.33, toHz: 698.46, at: 0.3, dur: 0.5, gain: 0.08, attack: 0.1, vibrato: { hz: 6, depth: 12 } },
    { type: 'sine', hz: 698.46, toHz: 554.37, at: 0.8, dur: 0.5, gain: 0.08, attack: 0.05, vibrato: { hz: 6, depth: 12 } },
    { type: 'sine', hz: 554.37, toHz: 440, at: 1.3, dur: 0.7, gain: 0.08, attack: 0.05, vibrato: { hz: 6, depth: 12 } },
  ],
  nav: clip('halloween/howl'),
  click: [
    clip('halloween/knock'),
    clip('halloween/laugh'),
    ...takes('halloween/click', 5),
    // A ghost: "oooOOooo".
    [
      { type: 'sine', hz: 420, toHz: 620, at: 0, dur: 0.25, gain: 0.2, attack: 0.08, vibrato: { hz: 7, depth: 18 } },
      { type: 'sine', hz: 620, toHz: 360, at: 0.23, dur: 0.3, gain: 0.2, attack: 0.02, vibrato: { hz: 7, depth: 18 } },
    ],
  ],
  scroll: takes('halloween/scroll', 4),
}
