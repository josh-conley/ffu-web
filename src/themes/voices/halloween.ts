import { later, type Note, type Voice } from './types'

// A haunted house. Wind, a low organ chord and a wavering theremin to open; then on every press
// a knock at the door, a ghost, or a creaking hinge; a wolf howling when you change page; and
// bat wings and rattling chains as you scroll.

const KNOCK: Note[] = [
  { type: 'sine', hz: 190, toHz: 90, at: 0, dur: 0.07, gain: 0.32 },
  { type: 'noise', hz: 600, q: 1, at: 0, dur: 0.04, gain: 0.22 },
]
const flap = (hz: number): Note[] => [
  { type: 'noise', hz, toHz: hz * 0.5, q: 1.2, at: 0, dur: 0.06, gain: 0.3, attack: 0.015 },
]
const CHAIN: Note[] = [
  { type: 'noise', hz: 5200, q: 9, at: 0, dur: 0.04, gain: 0.3 },
  { type: 'noise', hz: 6800, q: 9, at: 0.035, dur: 0.05, gain: 0.26 },
]

export const halloween: Voice = {
  chime: [
    { type: 'noise', hz: 500, q: 0.8, at: 0, dur: 2, gain: 0.14, attack: 0.7 },
    ...[73.42, 87.31, 110].map((hz): Note => ({ type: 'square', hz, at: 0.2, dur: 1.8, gain: 0.03, attack: 0.4 })),
    { type: 'sine', hz: 587.33, toHz: 698.46, at: 0.3, dur: 0.5, gain: 0.08, attack: 0.1, vibrato: { hz: 6, depth: 12 } },
    { type: 'sine', hz: 698.46, toHz: 554.37, at: 0.8, dur: 0.5, gain: 0.08, attack: 0.05, vibrato: { hz: 6, depth: 12 } },
    { type: 'sine', hz: 554.37, toHz: 440, at: 1.3, dur: 0.7, gain: 0.08, attack: 0.05, vibrato: { hz: 6, depth: 12 } },
  ],
  // A wolf: up to the held note, then falling away.
  nav: [
    { type: 'triangle', hz: 330, toHz: 620, at: 0, dur: 0.35, gain: 0.16, attack: 0.1 },
    { type: 'triangle', hz: 620, toHz: 560, at: 0.33, dur: 0.4, gain: 0.16, attack: 0.02, vibrato: { hz: 5, depth: 10 } },
    { type: 'triangle', hz: 560, toHz: 300, at: 0.7, dur: 0.4, gain: 0.14, attack: 0.02 },
  ],
  click: [
    // Knock, knock.
    [...KNOCK, ...later(KNOCK, 0.16)],
    // A ghost: "oooOOooo".
    [
      { type: 'sine', hz: 420, toHz: 620, at: 0, dur: 0.25, gain: 0.2, attack: 0.08, vibrato: { hz: 7, depth: 18 } },
      { type: 'sine', hz: 620, toHz: 360, at: 0.23, dur: 0.3, gain: 0.2, attack: 0.02, vibrato: { hz: 7, depth: 18 } },
    ],
    // A hinge that wants oiling.
    [{ type: 'sawtooth', hz: 70, toHz: 190, at: 0, dur: 0.42, gain: 0.1, attack: 0.05, vibrato: { hz: 28, depth: 14 } }],
  ],
  scroll: [flap(420), flap(340), CHAIN, flap(380), flap(300)],
}
