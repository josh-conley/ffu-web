import { steps, type Note, type Voice } from './types'

// Code coming down the wire. A burst of falling data over a low hum to begin; after that every
// press is a terminal: a heavy key, a glitch, a system thump. Changing page is a stream of data
// draining away, and scrolling is the trickle of characters going past.

/** High, clipped and slightly irregular: characters, not notes. */
const GLYPH_PITCHES = [2100, 2900, 1700, 3300, 2500, 1900, 3700, 2300]
const KEY: Note[] = [
  { type: 'noise', hz: 1800, q: 1.5, at: 0, dur: 0.035, gain: 0.32 },
  { type: 'square', hz: 180, at: 0, dur: 0.03, gain: 0.08 },
]

export const matrix: Voice = {
  chime: [
    ...steps(14, (i) => [{ type: 'square', hz: 2400 - i * 130 + (i % 3) * 220, at: i * 0.045, dur: 0.04, gain: 0.03 }]),
    { type: 'sawtooth', hz: 55, at: 0, dur: 1.4, gain: 0.08, attack: 0.5 },
    { type: 'sine', hz: 110, at: 0, dur: 1.4, gain: 0.1, attack: 0.5 },
    { type: 'sine', hz: 880, at: 0.7, dur: 0.6, gain: 0.05 },
  ],
  // A stream of data draining away into a thump.
  nav: [
    ...steps(9, (i) => [{ type: 'square', hz: 3200 - i * 300, at: i * 0.035, dur: 0.035, gain: 0.06 }]),
    { type: 'sine', hz: 140, toHz: 50, at: 0.3, dur: 0.25, gain: 0.3 },
  ],
  click: [
    // A key, and the character it types.
    [...KEY, { type: 'square', hz: 2400, toHz: 1300, at: 0.03, dur: 0.07, gain: 0.07 }],
    // A glitch.
    steps(5, (i) => [{ type: 'square', hz: GLYPH_PITCHES[i]!, at: i * 0.028, dur: 0.025, gain: 0.07 }]),
    // The system answering.
    [
      { type: 'sine', hz: 130, toHz: 60, at: 0, dur: 0.22, gain: 0.3 },
      { type: 'square', hz: 1760, at: 0.02, dur: 0.05, gain: 0.05 },
    ],
  ],
  scroll: GLYPH_PITCHES.map((hz): Note[] => [
    { type: 'square', hz, at: 0, dur: 0.03, gain: 0.06 },
    { type: 'square', hz: hz * 0.75, at: 0.03, dur: 0.03, gain: 0.04 },
  ]),
}
